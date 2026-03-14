'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Paragrafo, Versiculo } from '@/lib/types'

interface Props {
  paragrafo: Paragrafo
}

interface PainelData {
  ref: string
  livro: string
  abrev: string
  cap: number
  ver: number
  versiculos: Versiculo[]
  analise: string | null
  outros: { doc_id: string; content: string }[]
  carregando: boolean
}

export default function LeitorParagrafo({ paragrafo }: Props) {
  const [painel, setPainel] = useState<PainelData | null>(null)
  const textoRef = useRef<HTMLParagraphElement>(null)

  const abrirRef = useCallback(async (
    ref: string, livro: string, abrev: string, cap: number, ver: number
  ) => {
    setPainel({ ref, livro, abrev, cap, ver, versiculos: [], analise: null, outros: [], carregando: true })

    const [resVers, resOutros, resAnalise] = await Promise.all([
      fetch(`/api/versiculo?abrev=${abrev}&cap=${cap}&ver=${ver}`).then(r => r.json()),
      fetch(`/api/citantes?livro=${abrev}&cap=${cap}&ver=${ver}`).then(r => r.json()),
      fetch('/api/analise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paragrafo_num: paragrafo.metadata.id,
          paragrafo_texto: paragrafo.content,
          ref, livro, cap, ver
        })
      }).then(r => r.json()),
    ])

    setPainel(prev => prev ? {
      ...prev,
      versiculos: resVers.versiculos || [],
      outros: resOutros.docs || [],
      analise: resAnalise.analise || null,
      carregando: false,
    } : null)
  }, [paragrafo])

  // Anexar eventos aos spans após render
  useEffect(() => {
    const el = textoRef.current
    if (!el) return
    const spans = el.querySelectorAll<HTMLSpanElement>('.ref-biblica')
    spans.forEach(span => {
      span.onclick = () => {
        const ref = span.dataset.ref || ''
        const abrev = span.dataset.abrev || ''
        const livro = span.dataset.livro || ''
        const cap = parseInt(span.dataset.cap || '1')
        const ver = parseInt(span.dataset.ver || '1')
        abrirRef(ref, livro, abrev, cap, ver)
      }
    })
  }, [paragrafo, abrirRef])

  const numParagrafo = paragrafo.metadata.id
  const refs = paragrafo.metadata.refs_biblicas || []
  const textoHtml = renderizarTexto(paragrafo.content, refs)

  return (
    <div style={{ display: 'flex', gap: 0 }}>
      <article style={{ flex: 1, maxWidth: 680, padding: '32px 40px' }}>
        <header style={{ marginBottom: 24 }}>
          {paragrafo.metadata.parte && (
            <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', marginBottom: 4 }}>
              {paragrafo.metadata.parte}
            </p>
          )}
          {paragrafo.metadata.capitulo && (
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 13, color: '#555' }}>
              {paragrafo.metadata.capitulo}
            </p>
          )}
        </header>

        <span style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 500, color: 'var(--gold)', display: 'block', marginBottom: 16 }}>
          §{numParagrafo}
        </span>

        <p ref={textoRef}
          style={{ fontSize: 18, lineHeight: 1.8, letterSpacing: '0.01em' }}
          dangerouslySetInnerHTML={{ __html: textoHtml }}
        />

        {refs.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #E0DDD6' }}>
            <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA', marginBottom: 10 }}>
              Referências bíblicas
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {refs.map((r, i) => (
                <button key={i}
                  onClick={() => abrirRef(r.raw, r.livro, r.livro, parseInt(r.cap), parseInt(r.ver || '1'))}
                  style={{ fontSize: 13, color: 'var(--gold)', background: 'none', border: '1px solid #D4B86A44', borderRadius: 4, padding: '2px 8px', fontFamily: 'var(--font-serif)', cursor: 'pointer' }}>
                  {r.raw}
                </button>
              ))}
            </div>
          </div>
        )}
      </article>

      {painel && (
        <>
          <div onClick={() => setPainel(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)', zIndex: 99 }} />
          <aside style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
            background: '#FDFCF9', borderLeft: '1px solid #E0DDD6',
            zIndex: 100, overflowY: 'auto'
          }}>
            <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #E0DDD6', position: 'sticky', top: 0, background: '#FDFCF9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, color: 'var(--gold)' }}>{painel.ref}</p>
                <p style={{ fontSize: 13, color: '#888', marginTop: 2, fontStyle: 'italic' }}>{painel.livro}</p>
              </div>
              <button onClick={() => setPainel(null)}
                style={{ background: 'none', border: '1px solid #E0DDD6', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#888', cursor: 'pointer' }}>
                fechar
              </button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <section>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA', marginBottom: 10 }}>
                  Texto bíblico · Ave Maria
                </p>
                {painel.carregando ? (
                  <p style={{ fontSize: 14, color: '#AAA', fontStyle: 'italic' }}>Carregando…</p>
                ) : painel.versiculos.length > 0 ? (
                  <div style={{ fontSize: 15, lineHeight: 1.75 }}>
                    {painel.versiculos.map((v, i) => (
                      <span key={i} style={{
                        color: v.versiculo === painel.ver ? '#1A1A1A' : '#AAA',
                        fontStyle: v.versiculo === painel.ver ? 'normal' : 'italic'
                      }}>
                        {v.texto}{' '}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 14, color: '#AAA', fontStyle: 'italic' }}>Versículo não encontrado.</p>
                )}
              </section>

              <section>
                <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA', marginBottom: 10 }}>
                  Análise teológica
                </p>
                <div style={{ background: '#F2EFE8', borderRadius: 8, padding: '14px 16px', fontSize: 14, lineHeight: 1.7 }}>
                  {painel.carregando ? (
                    <p style={{ color: '#AAA', fontStyle: 'italic' }}>Consultando…</p>
                  ) : (
                    <p>{painel.analise || 'Análise não disponível.'}</p>
                  )}
                </div>
              </section>

              {painel.outros.length > 0 && (
                <section>
                  <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#AAA', marginBottom: 10 }}>
                    Outros parágrafos que citam {painel.ref}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {painel.outros.slice(0, 5).map((d, i) => {
                      const num = parseInt(d.doc_id.split('-')[1])
                      return (
                        <div key={i} style={{ padding: '8px 12px', background: '#F2EFE8', borderRadius: 6, fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--gold)', minWidth: 36 }}>§{num}</span>
                          <span style={{ color: '#666', lineHeight: 1.5 }}>{d.content.substring(0, 80)}…</span>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

function renderizarTexto(
  texto: string,
  refs: { raw: string; livro: string; cap: string; ver?: string }[]
): string {
  if (!refs.length) return texto
  let resultado = texto
  refs.forEach(r => {
    const escaped = r.raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    resultado = resultado.replace(
      new RegExp(escaped, 'g'),
      `<span class="ref-biblica" 
        data-ref="${r.raw}" 
        data-abrev="${r.livro}" 
        data-livro="${r.livro}" 
        data-cap="${r.cap}" 
        data-ver="${r.ver || '1'}" 
        style="color:var(--gold);cursor:pointer;border-bottom:1px dotted var(--gold);font-style:italic"
      >${r.raw}</span>`
    )
  })
  return resultado
}