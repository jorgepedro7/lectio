'use client'

import { useState, useRef, useEffect } from 'react'

interface Resultado {
  doc_id: string
  content: string
  metadata: { id: number; parte?: string; capitulo?: string }
}

interface BuscaResultado {
  catecismo: Resultado[]
  canonico: Resultado[]
  totalCCC: number
  totalCIC: number
  total: number
  offset: number
}

interface Props {
  onBuscar: (query: string, resultados: BuscaResultado) => void
}

export function Busca({ onBuscar }: Props) {
  const [query, setQuery] = useState('')
  const [carregando, setCarregando] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  async function buscar(q: string, offset = 0) {
    if (q.length < 3) return
    setCarregando(true)
    const res = await fetch('/api/busca?q=' + encodeURIComponent(q) + '&offset=' + offset)
    const data = await res.json()
    onBuscar(q, {
      catecismo: data.catecismo || [],
      canonico: data.canonico || [],
      totalCCC: data.totalCCC || 0,
      totalCIC: data.totalCIC || 0,
      total: data.total || 0,
      offset,
    })
    setCarregando(false)
  }

  useEffect(() => {
    if (query.length < 3) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => buscar(query, 0), 500)
  }, [query])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F2EFE8', border: '1px solid #E0DDD6', borderRadius: 6, padding: '6px 12px', width: 240 }}>
      <span style={{ fontSize: 13, color: '#AAA' }}>{carregando ? '…' : '⌕'}</span>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Pesquisar…"
        style={{ background: 'none', border: 'none', outline: 'none', fontSize: 14, color: '#1A1A1A', fontFamily: 'var(--font-serif)', width: '100%' }}
      />
      {query && (
        <button onClick={() => setQuery('')}
          style={{ background: 'none', border: 'none', color: '#AAA', fontSize: 16, padding: 0, cursor: 'pointer' }}>×</button>
      )}
    </div>
  )
}