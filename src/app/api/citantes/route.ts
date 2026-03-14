import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const livro = searchParams.get('livro')
  const cap = searchParams.get('cap')
  const ver = searchParams.get('ver')

  const { data: refs } = await supabase
    .from('referencias')
    .select('doc_id')
    .eq('livro', livro)
    .eq('capitulo', cap)
    .eq('versiculo', ver)

  if (!refs?.length) return NextResponse.json({ docs: [] })

  const docIds = refs.map((r: any) => r.doc_id)
  const { data: docs } = await supabase
    .from('documents')
    .select('doc_id, content')
    .in('doc_id', docIds)
    .limit(5)

  return NextResponse.json({ docs: docs || [] })
}