import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const abrev = searchParams.get('abrev')
  const cap = parseInt(searchParams.get('cap') || '1')
  const ver = parseInt(searchParams.get('ver') || '1')

  console.log('Params:', { abrev, cap, ver })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await sb
    .from('versiculos')
    .select('*')
    .eq('abrev', abrev)
    .eq('capitulo', cap)
    .eq('versiculo', ver)

  console.log('Data:', data)
  console.log('Error:', error)

  return NextResponse.json({ versiculos: data || [], error: error?.message })
}