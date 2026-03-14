import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LIMIT = 50

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!q || q.length < 3) return NextResponse.json({ resultados: [] })

  // Contar total
  const { count: totalCCC } = await sb
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .like('doc_id', 'CCC-%')
    .ilike('content', `%${q}%`)

  const { count: totalCIC } = await sb
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .like('doc_id', 'CIC-%')
    .ilike('content', `%${q}%`)

  const { data: ccc } = await sb
    .from('documents')
    .select('doc_id, content, metadata')
    .like('doc_id', 'CCC-%')
    .ilike('content', `%${q}%`)
    .order('doc_id')
    .range(offset, offset + LIMIT - 1)

  const { data: cic } = await sb
    .from('documents')
    .select('doc_id, content, metadata')
    .like('doc_id', 'CIC-%')
    .ilike('content', `%${q}%`)
    .order('doc_id')
    .range(offset, offset + LIMIT - 1)

  return NextResponse.json({
    catecismo: ccc || [],
    canonico: cic || [],
    totalCCC: totalCCC || 0,
    totalCIC: totalCIC || 0,
    total: (totalCCC || 0) + (totalCIC || 0),
    offset,
    limit: LIMIT,
    query: q,
  })
}