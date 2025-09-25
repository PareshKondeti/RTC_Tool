import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 })
    }

    const { roomId, userEmail, op } = await req.json()
    if (!roomId || !userEmail || !op) {
      return NextResponse.json({ error: 'Missing roomId, userEmail or op' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('document_ops')
      .insert({ room_id: roomId, user_email: userEmail, op_json: op })

    if (error) {
      console.error('Insert op failed', error)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Ops POST error', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase not configured.' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const roomId = searchParams.get('roomId')
    const limitParam = searchParams.get('limit')
    const limit = Math.min(Number(limitParam || 100), 500)

    if (!roomId) return NextResponse.json({ error: 'Missing roomId' }, { status: 400 })

    const { data, error } = await supabaseServer
      .from('document_ops')
      .select('id, created_at, user_email, op_json')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Fetch ops failed', error)
      return NextResponse.json({ error: 'Fetch failed' }, { status: 500 })
    }

    return NextResponse.json({ ops: data })
  } catch (e) {
    console.error('Ops GET error', e)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}


