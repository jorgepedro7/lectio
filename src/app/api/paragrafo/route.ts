import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const doc_id = searchParams.get('doc_id')
  const parte = searchParams.get('parte')
  const offset = parseInt(searchParams.get('offset') || '0')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (doc_id) {
    const { data } = await sb
      .from('documents')
      .select('*')
      .eq('doc_id', doc_id)
      .single()
    return NextResponse.json({ paragrafo: data })
  }

  if (parte) {
    // 'parte' aqui já vem como valor real do banco (ex: 'A PROFISSÃO DA FÉ')
    const { data } = await sb
      .from('documents')
      .select('*')
      .like('doc_id', 'CCC-%')
      .eq('metadata->>parte', parte)
      .order('doc_id')
      .range(offset, offset + limit - 1)
    return NextResponse.json({ paragrafos: data || [] })
  }
  }