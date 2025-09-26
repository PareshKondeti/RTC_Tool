// RTC Tool - Version Revert API
// Author: Paresh Kondeti
// Date: January 2025
// Creates a new version by copying content from an existing version

import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase not configured. Check env.' }, { status: 500 })
    }

    // Parse body with support for JSON, text, and FormData
    let body: any
    try {
      body = await req.json()
    } catch {
      try {
        const text = await req.text()
        body = JSON.parse(text)
      } catch {
        try {
          const formData = await req.formData()
          const dataStr = formData.get('data') as string
          if (dataStr) {
            body = JSON.parse(dataStr)
          } else {
            return NextResponse.json({ error: 'Invalid request body format' }, { status: 400 })
          }
        } catch {
          return NextResponse.json({ error: 'Invalid request body format' }, { status: 400 })
        }
      }
    }

    const roomId = body?.roomId as string | undefined
    const versionId = body?.versionId as number | undefined
    const authorEmail = body?.authorEmail as string | undefined
    const title = body?.title as string | undefined

    if (!roomId || !versionId || !authorEmail) {
      return NextResponse.json({ error: 'Missing roomId, versionId or authorEmail' }, { status: 400 })
    }

    // Fetch the version to copy
    const { data: src, error: fetchErr } = await supabaseServer
      .from('document_versions')
      .select('id, room_id, content_json')
      .eq('id', versionId)
      .single()

    if (fetchErr || !src) {
      return NextResponse.json({ error: fetchErr?.message || 'Version not found' }, { status: 404 })
    }

    if (src.room_id !== roomId) {
      return NextResponse.json({ error: 'Version does not belong to room' }, { status: 400 })
    }

    // Upsert document metadata
    const upsert = await supabaseServer
      .from('documents')
      .upsert(
        [{ room_id: roomId, title: title ?? 'Untitled', created_by: authorEmail }],
        { onConflict: 'room_id' }
      )
    if (upsert.error) {
      return NextResponse.json({ error: 'Upsert failed', details: upsert.error.message }, { status: 500 })
    }

    // Determine next version number
    const { data: versions, error: verErr } = await supabaseServer
      .from('document_versions')
      .select('version')
      .eq('room_id', roomId)
      .order('version', { ascending: false })
      .limit(1)

    if (verErr) {
      // Continue with fallback to 1
      console.error('Failed to read last version', verErr)
    }

    const nextVersion = versions && versions.length > 0 ? (versions[0].version as number) + 1 : 1

    const { error: insErr } = await supabaseServer
      .from('document_versions')
      .insert({
        room_id: roomId,
        version: nextVersion,
        author_email: authorEmail,
        content_json: src.content_json,
      })

    if (insErr) {
      return NextResponse.json({ error: 'Insert failed', details: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, version: nextVersion, content: src.content_json })
  } catch (e: any) {
    return NextResponse.json({ error: 'Unexpected error', details: e?.message ?? String(e) }, { status: 500 })
  }
}


