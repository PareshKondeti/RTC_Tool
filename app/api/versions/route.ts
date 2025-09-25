// RTC Tool - Version History API
// Author: Paresh Kondeti
// Date: January 2025
// Handles document versioning and persistence

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase not configured. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE.' }, { status: 500 })
    }

    // Handle both regular JSON and sendBeacon requests
    let body;
    try {
      body = await req.json()
    } catch {
      // If JSON parsing fails, try to read as text (sendBeacon)
      const text = await req.text()
      body = JSON.parse(text)
    }
    
    const roomId = body?.roomId as string | undefined
    const title = body?.title as string | undefined
    const authorEmail = body?.authorEmail as string | undefined
    const rawContent = body?.content

    if (!roomId || !authorEmail || rawContent == null) {
      return NextResponse.json({ error: 'Missing roomId, authorEmail or content' }, { status: 400 })
    }

    const content = typeof rawContent === 'string' ? JSON.parse(rawContent) : rawContent

    // Upsert document metadata
    const upsert = await supabaseServer
      .from('documents')
      .upsert(
        [{ room_id: roomId, title: title ?? 'Untitled', created_by: authorEmail }],
        { onConflict: 'room_id' }
      )
    if (upsert.error) {
      console.error('Documents upsert failed', upsert.error)
      return NextResponse.json({ error: 'Upsert failed', details: upsert.error.message }, { status: 500 })
    }

    // Get next version number
    const { data: versions, error: verErr } = await supabaseServer
      .from('document_versions')
      .select('version')
      .eq('room_id', roomId)
      .order('version', { ascending: false })
      .limit(1)

    if (verErr) {
      console.error('Failed to read last version', verErr)
    }

    const nextVersion = versions && versions.length > 0 ? (versions[0].version as number) + 1 : 1

    const { error: insErr } = await supabaseServer
      .from('document_versions')
      .insert({
        room_id: roomId,
        version: nextVersion,
        author_email: authorEmail,
        content_json: content,
      })

    if (insErr) {
      console.error('Insert version failed', insErr)
      return NextResponse.json({ error: 'Insert failed', details: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, version: nextVersion })
  } catch (e: any) {
    console.error('Save version error', e)
    return NextResponse.json({ error: 'Unexpected error', details: e?.message ?? String(e) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase not configured. Check env.' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const versionId = searchParams.get('versionId')

    if (versionId) {
      const { data, error } = await supabaseServer
        .from('document_versions')
        .select('id, room_id, version, author_email, content_json, created_at')
        .eq('id', Number(versionId))
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, version: data })
    }

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('document_versions')
      .select('id, version, author_email, created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, versions: data })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: e?.message ?? String(e) }, { status: 500 })
  }
}


