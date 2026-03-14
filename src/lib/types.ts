export interface Paragrafo {
  id: number
  doc_id: string
  content: string
  metadata: {
    id: number
    source: string
    lang: string
    parte?: string
    secao?: string
    capitulo?: string
    artigo?: string
    refs_biblicas?: RefBiblica[]
    notas_raw?: Record<string, string>
  }
}

export interface RefBiblica {
  raw: string
  livro: string
  cap: string
  ver?: string
}

export interface Versiculo {
  id: number
  livro: string
  abrev: string
  capitulo: number
  versiculo: number
  texto: string
}

export interface ResultadoBusca {
  doc_id: string
  content: string
  metadata: Paragrafo['metadata']
  similarity: number
}

// Adicionar na interface que define os itens de navegação
export interface ItemNav {
  doc_id: string
  num: number
  parte: string
  capitulo: string
  parteDB: string
}