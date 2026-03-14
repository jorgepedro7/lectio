'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Paragrafo } from '@/lib/types'
import LeitorParagrafo from './LeitorParagrafo'
import { Busca } from './Busca'

interface ItemNav {
  doc_id: string
  num: number
  parte: string
  capitulo: string
  parteDB: string
}

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
  partes: Record<string, ItemNav[]>
}

const LIMIT = 20

export default function LeitorClient({ partes }: Props) {
  const [parteAtual, setParteAtual] = useState(Object.keys(partes)[0] || '')
  const [paragrafos, setParagrafos] = useState<Paragrafo[]>([])
  const [temMais, setTemMais] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [itemVisivel, setItemVisivel] = useState<string | null>(null)
  const [modoBusca, setModoBusca] = useState(false)
  const [queryAtual, setQueryAtual] = useState('')
  const [resultados, setResultados] = useState<BuscaResultado>({ catecismo: [], canonico: [], totalCCC: 0, totalCIC: 0, total: 0, offset: 0 })
  const [paraDestaque, setParagrafoDestaque] = useState<string | null>(null)
  const [sidebarAberta, setSidebarAberta] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const sidebarRef = useRef<HTMLDivElement>(null)
  const sentinelaRef = useRef<HTMLDivElement>(null)
  const observerConteudoRef = useRef<IntersectionObserver | null>(null)
  const observerSentinelaRef = useRef<IntersectionObserver | null>(null)
  const carregandoRef = useRef(false)
  const offsetRef = useRef(0)
  const temMaisRef = useRef(true)
  const parteDBRef = useRef('')

  const itens = partes[parteAtual] || []
  const todosResultados = [...resultados.catecismo, ...resultados.canonico]

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const carregarLote = useCallback(async (parteDB: string, off: number) => {
    if (carregandoRef.current || !temMaisRef.current) return
    carregandoRef.current = true
    setCarregando(true)
    try {
      const res = await fetch('/api/paragrafo?parte=' + encodeURIComponent(parteDB) + '&offset=' + off + '&limit=' + LIMIT)
      const data = await res.json()
      const novos: Paragrafo[] = data.paragrafos || []
      if (off === 0) setParagrafos(novos)
      else setParagrafos(prev => [...prev, ...novos])
      const novoOffset = off + novos.length
      offsetRef.current = novoOffset
      const ainda = novos.length === LIMIT
      temMaisRef.current = ainda
      setTemMais(ainda)
    } finally {
      carregandoRef.current = false
      setCarregando(false)
    }
  }, [])

  function trocarParte(nome: string) {
    const parteDB = partes[nome]?.[0]?.parteDB || nome
    parteDBRef.current = parteDB
    setParteAtual(nome)
    setParagrafos([])
    offsetRef.current = 0
    temMaisRef.current = true
    setTemMais(true)
    setItemVisivel(null)
    setModoBusca(false)
    setSidebarAberta(false)
    window.scrollTo({ top: 0 })
    carregarLote(parteDB, 0)
  }

  function handleBusca(query: string, res: BuscaResultado) {
    setQueryAtual(query)
    if (res.offset === 0) setResultados(res)
    else setResultados(prev => ({ ...res, catecismo: [...prev.catecismo, ...res.catecismo], canonico: [...prev.canonico, ...res.canonico] }))
    setModoBusca(true)
    setSidebarAberta(false)
    if (res.offset === 0) window.scrollTo({ top: 0 })
  }

  function sairBusca() {
    setModoBusca(false)
    setQueryAtual('')
    setResultados({ catecismo: [], canonico: [], totalCCC: 0, totalCIC: 0, total: 0, offset: 0 })
    setParagrafoDestaque(null)
  }

  async function verMaisCCC() {
    const res = await fetch('/api/busca?q=' + encodeURIComponent(queryAtual) + '&offset=' + resultados.catecismo.length)
    const data = await res.json()
    handleBusca(queryAtual, { catecismo: data.catecismo || [], canonico: [], totalCCC: data.totalCCC || 0, totalCIC: data.totalCIC || 0, total: data.total || 0, offset: resultados.catecismo.length })
  }

  async function verMaisCIC() {
    const res = await fetch('/api/busca?q=' + encodeURIComponent(queryAtual) + '&offset=' + resultados.canonico.length)
    const data = await res.json()
    handleBusca(queryAtual, { catecismo: [], canonico: data.canonico || [], totalCCC: data.totalCCC || 0, totalCIC: data.totalCIC || 0, total: data.total || 0, offset: resultados.canonico.length })
  }

  function destacarTexto(texto: string, q: string) {
    if (!q) return texto
    return texto.replace(
      new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'),
      '<mark style="background:#D4B86A44;color:var(--gold);border-radius:2px;padding:0 1px">$1</mark>'
    )
  }

function scrollParaParagrafo(docId: string) {
  setSidebarAberta(false)
  const el = document.querySelector('[data-doc-id="' + docId + '"]')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  // Parágrafo não carregado — buscar e inserir na ordem correta
  fetch('/api/paragrafo?doc_id=' + docId).then(r => r.json()).then(data => {
    if (data.paragrafo) {
      const numAlvo = parseInt(docId.split('-')[1])
      setParagrafos(prev => {
        if (prev.find(p => p.doc_id === docId)) return prev
        // Inserir na posição correta por número
        const idx = prev.findIndex(p => parseInt(p.doc_id.split('-')[1]) > numAlvo)
        if (idx === -1) return [...prev, data.paragrafo]
        const novo = [...prev]
        novo.splice(idx, 0, data.paragrafo)
        return novo
      })
      setTimeout(() => {
        document.querySelector('[data-doc-id="' + docId + '"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 150)
    }
  })
}

  useEffect(() => {
    const primeira = Object.keys(partes)[0]
    if (primeira) {
      const parteDB = partes[primeira]?.[0]?.parteDB || primeira
      parteDBRef.current = parteDB
      carregarLote(parteDB, 0)
    }
  }, [])

  useEffect(() => {
    observerSentinelaRef.current?.disconnect()
    if (!sentinelaRef.current || modoBusca) return
    observerSentinelaRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) carregarLote(parteDBRef.current, offsetRef.current)
    }, { threshold: 0.1 })
    observerSentinelaRef.current.observe(sentinelaRef.current)
    return () => observerSentinelaRef.current?.disconnect()
  }, [carregarLote, modoBusca])

  useEffect(() => {
    observerConteudoRef.current?.disconnect()
    if (modoBusca) return
    observerConteudoRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setItemVisivel(entry.target.getAttribute('data-doc-id')) })
    }, { threshold: 0.3, rootMargin: '-10% 0px -60% 0px' })
    document.querySelectorAll('[data-doc-id]').forEach(el => observerConteudoRef.current?.observe(el))
    return () => observerConteudoRef.current?.disconnect()
  }, [paragrafos, modoBusca])

  useEffect(() => {
    if (!itemVisivel || !sidebarRef.current) return
    const btn = sidebarRef.current.querySelector('[data-sidebar-id="' + itemVisivel + '"]') as HTMLElement
    btn?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [itemVisivel])

  const topOffset = modoBusca ? 49 : (isMobile ? 97 : 97)

  return (
    <main style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Header */}
      <header style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', padding: isMobile ? '10px 16px' : '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 20, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          {/* Botão menu mobile */}
          {isMobile && !modoBusca && (
            <button onClick={() => setSidebarAberta(v => !v)}
              style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 16, color: 'var(--text-muted)', flexShrink: 0 }}>
              ☰
            </button>
          )}
          {modoBusca ? (
            <>
              <button onClick={sairBusca} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--font-serif)', cursor: 'pointer', whiteSpace: 'nowrap' }}>← leitura</button>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 11 : 13, color: 'var(--gold)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                "{queryAtual}" — {resultados.totalCCC + resultados.totalCIC} resultados
              </span>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 500, letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Lectio</h1>
              {!isMobile && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Catecismo da Igreja Católica</span>}
            </>
          )}
        </div>
        <Busca onBuscar={handleBusca} isMobile={isMobile} />
      </header>

      {/* Nav partes */}
      {!modoBusca && (
        <nav style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)', padding: '0 16px', display: 'flex', overflowX: 'auto', position: 'sticky', top: 49, zIndex: 19, scrollbarWidth: 'none' }}>
          {Object.keys(partes).map(parte => (
            <button key={parte} onClick={() => trocarParte(parte)} style={{ padding: isMobile ? '8px 12px' : '10px 16px', background: 'none', border: 'none', borderBottom: parte === parteAtual ? '2px solid var(--gold)' : '2px solid transparent', fontSize: isMobile ? 12 : 13, color: parte === parteAtual ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'var(--font-serif)' }}>
              {isMobile ? parte.replace('A Celebração do Mistério Cristão', 'Celebração').replace('A Profissão da Fé', 'Profissão').replace('A Vida em Cristo', 'Vida').replace('A Oração Cristã', 'Oração') : parte}
            </button>
          ))}
        </nav>
      )}

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Overlay mobile */}
        {isMobile && sidebarAberta && (
          <div onClick={() => setSidebarAberta(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 29 }} />
        )}

        {/* Sidebar */}
        <aside ref={sidebarRef} style={{
          width: 180,
          minWidth: 180,
          background: 'var(--bg-primary)',
          borderRight: '1px solid var(--border)',
          position: isMobile ? 'fixed' : 'sticky',
          top: isMobile ? 0 : topOffset,
          left: 0,
          height: isMobile ? '100vh' : `calc(100vh - ${topOffset}px)`,
          overflowY: 'auto',
          zIndex: isMobile ? 30 : 1,
          transform: isMobile ? (sidebarAberta ? 'translateX(0)' : 'translateX(-100%)') : 'none',
          transition: isMobile ? 'transform 0.25s ease' : 'none',
          paddingTop: isMobile ? 60 : 0,
        }}>
          <p style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '12px 16px 8px' }}>
            {modoBusca ? todosResultados.length + ' resultados' : itens.length + ' parágrafos'}
          </p>
          {modoBusca ? (
            todosResultados.map(r => (
              <button key={r.doc_id}
                onClick={() => { setParagrafoDestaque(r.doc_id); document.querySelector('[data-resultado-id="' + r.doc_id + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
                style={{ width: '100%', padding: '6px 16px', background: paraDestaque === r.doc_id ? 'var(--bg-tertiary)' : 'none', border: 'none', borderLeft: paraDestaque === r.doc_id ? '2px solid var(--gold)' : '2px solid transparent', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: paraDestaque === r.doc_id ? 'var(--gold)' : 'var(--text-muted)' }}>
                  {r.doc_id.startsWith('CIC') ? r.doc_id.replace('CIC-can-', 'c.') : '§' + r.metadata.id}
                </span>
              </button>
            ))
          ) : (
            itens.map(item => (
              <button key={item.doc_id} data-sidebar-id={item.doc_id} onClick={() => scrollParaParagrafo(item.doc_id)}
                style={{ width: '100%', padding: '6px 16px', background: itemVisivel === item.doc_id ? 'var(--bg-tertiary)' : 'none', border: 'none', borderLeft: itemVisivel === item.doc_id ? '2px solid var(--gold)' : '2px solid transparent', display: 'flex', alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: itemVisivel === item.doc_id ? 'var(--gold)' : 'var(--text-muted)' }}>§{item.num}</span>
              </button>
            ))
          )}
        </aside>

        {/* Conteúdo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {modoBusca && (
            <div>
              {resultados.catecismo.length > 0 && (
                <div>
                  <div style={{ padding: '16px 24px 8px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Catecismo</span>
                    <span style={{ fontSize: 12, color: 'var(--gold)', background: '#D4B86A22', borderRadius: 4, padding: '2px 8px' }}>{resultados.catecismo.length} de {resultados.totalCCC}</span>
                  </div>
                  {resultados.catecismo.map(r => (
                    <div key={r.doc_id} data-resultado-id={r.doc_id}
                      style={{ padding: isMobile ? '20px 16px' : '24px 40px', borderBottom: '1px solid var(--border-light)', background: paraDestaque === r.doc_id ? '#FFFEF9' : 'transparent', transition: 'background 0.3s' }}>
                      {r.metadata.parte && <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4 }}>{r.metadata.parte}</p>}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: isMobile ? 18 : 22, color: 'var(--gold)', display: 'block', marginBottom: 12 }}>§{r.metadata.id}</span>
                      <p style={{ fontSize: isMobile ? 16 : 17, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: destacarTexto(r.content, queryAtual) }} />
                    </div>
                  ))}
                  {resultados.catecismo.length < resultados.totalCCC && (
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <button onClick={verMaisCCC} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 20px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)', cursor: 'pointer' }}>
                        ver mais {Math.min(50, resultados.totalCCC - resultados.catecismo.length)} de {resultados.totalCCC - resultados.catecismo.length} restantes
                      </button>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{resultados.catecismo.length} de {resultados.totalCCC}</span>
                    </div>
                  )}
                </div>
              )}
              {resultados.canonico.length > 0 && (
                <div>
                  <div style={{ padding: '16px 24px 8px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Direito Canônico</span>
                    <span style={{ fontSize: 12, color: '#8B6B8A', background: '#8B6B8A22', borderRadius: 4, padding: '2px 8px' }}>{resultados.canonico.length} de {resultados.totalCIC}</span>
                  </div>
                  {resultados.canonico.map(r => (
                    <div key={r.doc_id} data-resultado-id={r.doc_id}
                      style={{ padding: isMobile ? '20px 16px' : '24px 40px', borderBottom: '1px solid var(--border-light)' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: '#8B6B8A', display: 'block', marginBottom: 12 }}>{r.doc_id.replace('CIC-can-', 'Cânon ')}</span>
                      <p style={{ fontSize: isMobile ? 15 : 16, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: destacarTexto(r.content, queryAtual) }} />
                    </div>
                  ))}
                  {resultados.canonico.length < resultados.totalCIC && (
                    <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      <button onClick={verMaisCIC} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 20px', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'var(--font-serif)', cursor: 'pointer' }}>
                        ver mais {Math.min(50, resultados.totalCIC - resultados.canonico.length)} de {resultados.totalCIC - resultados.canonico.length} restantes
                      </button>
                    </div>
                  )}
                </div>
              )}
              {todosResultados.length === 0 && (
                <div style={{ padding: '60px 24px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum resultado encontrado.</div>
              )}
            </div>
          )}

          {!modoBusca && (
            <>
              {carregando && paragrafos.length === 0 && (
                <div style={{ padding: '40px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Carregando…</div>
              )}
              {paragrafos.map(p => (
                <div key={p.doc_id} data-doc-id={p.doc_id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <LeitorParagrafo paragrafo={p} />
                </div>
              ))}
              <div ref={sentinelaRef} style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {carregando && paragrafos.length > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Carregando mais…</span>}
                {!temMais && paragrafos.length > 0 && <span style={{ fontSize: 13, color: 'var(--border)', fontStyle: 'italic' }}>Fim desta parte</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}