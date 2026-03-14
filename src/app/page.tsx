import { supabase } from '@/lib/supabase'
import LeitorClient from '@/components/LeitorClient'

export default async function Home() {
  const { data } = await supabase
    .from('documents')
    .select('doc_id, metadata')
    .like('doc_id', 'CCC-%')
    .order('doc_id')

  // Nomes para exibição → valor real no banco
  const MAPA_PARTES: Record<string, string> = {
    'Prólogo': 'PRÓLOGO',
    'A Profissão da Fé': 'A PROFISSÃO DA FÉ',
    'A Celebração do Mistério Cristão': 'A CELEBRAÇÃO DO MISTÉRIO CRISTÃO',
    'A Vida em Cristo': 'TERCEIRA PARTE: A VIDA EM CRISTO',
    'A Oração Cristã': 'A ORAÇÃO CRISTÃ',
  }

  const partes: Record<string, { doc_id: string; num: number; parte: string; capitulo: string; parteDB: string }[]> = {}

  Object.keys(MAPA_PARTES).forEach(nome => { partes[nome] = [] })

  data?.forEach((d: any) => {
    const num = parseInt(d.doc_id.split('-')[1])
    const parteDB = d.metadata?.parte || ''

    // Encontrar nome de exibição pelo valor do banco
    const nomeExibicao = Object.entries(MAPA_PARTES).find(
      ([_, db]) => db === parteDB
    )?.[0]

    if (!nomeExibicao) return // ignorar os 92 sem parte

    partes[nomeExibicao].push({
      doc_id: d.doc_id,
      num,
      parte: nomeExibicao,
      capitulo: d.metadata?.capitulo || '',
      parteDB, // valor real para usar na query
    })
  })

  // Remover partes vazias
  Object.keys(partes).forEach(p => {
    if (partes[p].length === 0) delete partes[p]
  })

  return <LeitorClient partes={partes} />
}