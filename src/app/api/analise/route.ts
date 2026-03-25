import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// 1. Instanciar os clientes FORA do handler para reaproveitamento (Connection Pooling)

// Cliente público para leitura
const sbPublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cliente privilegiado para escrita (ignora RLS)
const sbAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { paragrafo_num, paragrafo_texto, ref, livro, cap, ver } = await req.json()

    const doc_id = `CCC-${String(paragrafo_num).padStart(6, '0')}`
    const referencia = ref

    // 2. Buscar no cache usando o cliente público
    const { data: cache } = await sbPublic
      .from('analises')
      .select('analise')
      .eq('doc_id', doc_id)
      .eq('referencia', referencia)
      .single()

    if (cache?.analise) {
      console.log(`Cache hit: ${doc_id} + ${referencia}`)
      return NextResponse.json({ analise: cache.analise, cached: true })
    }

    // 3. Gerar com IA
    console.log(`Gerando análise: ${doc_id} + ${referencia}`)

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { analise: 'Chave da Anthropic não configurada.', cached: false },
        { status: 500 }
      )
    }

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: 'Você é um teólogo católico que explica, de forma breve e acessível, por que um trecho bíblico é citado em um parágrafo do Catecismo da Igreja Católica. Responda em 3-4 frases em português, sem markdown, de forma direta e pastoral. Não use asteriscos nem formatação.',
      messages: [{
        role: 'user',
        content: `O parágrafo §${paragrafo_num} do Catecismo diz: "${paragrafo_texto.substring(0, 400)}..."\n\nEle cita ${ref} (${livro} ${cap},${ver}).\n\nPor que este trecho bíblico fundamenta o que o Catecismo ensina aqui?`
      }]
    })

    const analise = msg.content[0].type === 'text' ? msg.content[0].text : ''

    // 4. Salvar no cache usando o cliente Admin
    await sbAdmin.from('analises').insert({ doc_id, referencia, analise })

    return NextResponse.json({ analise, cached: false })

  } catch (error: any) {
    console.error('Erro na API (Anthropic ou Supabase):', error.message)
    return NextResponse.json(
      { analise: 'Não foi possível gerar ou salvar a análise.', cached: false },
      { status: 500 }
    )
  }
}
