import { supabase } from './supabase'
import { Paragrafo, Versiculo, ResultadoBusca } from './types'

export async function getParagrafo(num: number): Promise<Paragrafo | null> {
  const docId = `CCC-${String(num).padStart(6, '0')}`
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('doc_id', docId)
    .single()
  if (error) return null
  return data
}

export async function getParagrafos(inicio: number, fim: number): Promise<Paragrafo[]> {
  const ids = Array.from({ length: fim - inicio + 1 }, (_, i) =>
    `CCC-${String(inicio + i).padStart(6, '0')}`
  )
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .in('doc_id', ids)
    .order('doc_id')
  if (error) return []
  return data
}

export async function getVersiculo(
  abrev: string,
  capitulo: number,
  versiculo: number
): Promise<Versiculo | null> {
  const { data, error } = await supabase
    .from('versiculos')
    .select('*')
    .eq('abrev', abrev)
    .eq('capitulo', capitulo)
    .eq('versiculo', versiculo)
    .single()
  if (error) return null
  return data
}

export async function getVersiculosContexto(
  abrev: string,
  capitulo: number,
  versiculo: number,
  janela = 2
): Promise<Versiculo[]> {
  const { data, error } = await supabase
    .from('versiculos')
    .select('*')
    .eq('abrev', abrev)
    .eq('capitulo', capitulo)
    .gte('versiculo', Math.max(1, versiculo - janela))
    .lte('versiculo', versiculo + janela)
    .order('versiculo')
  if (error) return []
  return data
}

export async function getParagrafosQueCitam(
  livro: string,
  cap: string,
  ver: string
): Promise<{ doc_id: string; content: string }[]> {
  const { data, error } = await supabase
    .from('referencias')
    .select('doc_id')
    .eq('livro', livro)
    .eq('capitulo', cap)
    .eq('versiculo', ver)
  if (error) return []
  const docIds = data.map((r: any) => r.doc_id)
  if (docIds.length === 0) return []
  const { data: docs } = await supabase
    .from('documents')
    .select('doc_id, content')
    .in('doc_id', docIds)
  return docs || []
}