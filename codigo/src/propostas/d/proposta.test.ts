import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
// @ts-ignore: a suíte roda em Node e o tsconfig do app exclui os tipos globais de Node.
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { carregarDadosInicio, type DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import type { PropsProposta } from '../Propostas'
import { Proposta } from './Proposta'

const css = readFileSync(new URL('./rumo.css', import.meta.url), 'utf8')

let dados: DadosInicio
beforeAll(async () => {
  dados = await carregarDadosInicio()
})

function render(config: Partial<PropsProposta & { oculto: boolean }> = {}, olhoDaCasca = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: olhoDaCasca },
      createElement(Proposta, { dados, tema: 'claro', dispositivo: 'celular', ...config }),
    ),
  )
}

const marcador = /data-numero-financeiro="true"/g
const contar = (html: string) => [...html.matchAll(marcador)].length
const texto = (html: string) =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const contextos = [
  { tema: 'claro', dispositivo: 'celular' },
  { tema: 'escuro', dispositivo: 'celular' },
  { tema: 'claro', dispositivo: 'desktop' },
  { tema: 'escuro', dispositivo: 'desktop' },
] as const

describe('Rumo a 2029 no laboratório', () => {
  it.each(contextos)('renderiza $dispositivo em tema $tema com os valores oficiais do exemplo', contexto => {
    const html = render(contexto)
    const conteudo = texto(html)
    const plano = dados.plano2029
    const oficial = plano.faltamPorMesComMargem
    const semMargem = plano.faltamPorMesSemMargem
    const cobertura = plano.progressao
    expect(html).toContain(`data-tema="${contexto.tema}" data-tela="${contexto.dispositivo}"`)
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(conteudo).toContain('Rumo a 2029')
    expect(html.match(/>Exemplo</g)).toHaveLength(1)
    expect(oficial.estado).toBe('pronto')
    expect(conteudo).toContain(`Falta por mês · com margem${texto(brl.format(oficial.valor! / 100))}`)
    expect(semMargem.estado).toBe('pronto')
    expect(html).toMatch(/<details class="rumo-cenario"><summary>Cenário sem margem/)
    expect(conteudo).not.toContain(texto(brl.format(semMargem.valor! / 100)))
    expect(cobertura.estado).toBe('pronto')
    expect(conteudo).toContain(
      `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(cobertura.valor!)}%`,
    )
    expect(html).toContain('Quem trabalha por você')
    expect(html).toContain('escritorio-maquete')
  })

  it('desenha uma trilha grossa com marcadores de calendário e posição baseada na cobertura oficial', () => {
    const html = render()
    expect(html).toContain('Você está aqui')
    expect(texto(html)).toContain('Viver de rendimentos')
    expect(html).toMatch(
      /<ol class="rumo-marcos" aria-label="Marcos do calendário"><li>2026<\/li><li>2027<\/li><li>2028<\/li><li>2029<\/li><\/ol>/,
    )
    expect(html).toMatch(/class="rumo-posicao" cx="[^"]+" cy="[^"]+"/)
    expect(html).toContain('class="rumo-haste"')
    expect(render({ dispositivo: 'desktop' })).toMatch(/class="rumo-trilha"[^>]*viewBox="0 0 640 128"/)
    expect(css).toMatch(/\.rumo-caminho\s*\{[^}]*stroke-width: 15/)
    expect(css).toMatch(/\.rumo-valor-principal, \.rumo \.rumo-percentual\s*\{[^}]*font-size: 2.25rem/)
  })

  it.each([
    { valor: 0, x: '20.00', y: '94.00', pinta: false },
    { valor: 50, x: '160.00', y: '77.50', pinta: true },
    { valor: 125, x: '300.00', y: '28.00', pinta: true },
  ])('posiciona o ponto para $valor% e preserva o número do contrato', ({ valor, x, y, pinta }) => {
    const exemplo = structuredClone(dados)
    exemplo.plano2029.progressao = { ...exemplo.plano2029.progressao, estado: 'pronto', valor }
    const html = render({ dados: exemplo })
    expect(html).toContain(`class="rumo-posicao" cx="${x}" cy="${y}"`)
    expect(html.includes('class="rumo-cobertura"')).toBe(pinta)
    expect(texto(html)).toContain(`Você está aqui${valor}%`)
  })

  it('apresenta os três motores ilustrados e liga cada um à pessoa identificada na maquete', () => {
    const html = render()
    expect(html.match(/class="rumo-motor-figura"><svg/g)).toHaveLength(3)
    expect(html.match(/class="rumo-acao rumo-responsavel"/g)).toHaveLength(3)
    expect(html).toContain('aria-label="Ver Gestor do Guardado no escritório"')
    const maquete =
      html.match(
        /<div class="rumo-maquete" role="img" aria-label="Maquete isométrica do escritório">(<svg[\s\S]*?)<\/div><div class="rumo-equipe"/,
      )?.[1] ?? ''
    expect(maquete).toMatch(/^<svg\b[^>]*data-variante="media"[^>]*aria-hidden="true"/)
    const nomes = [
      ...maquete.matchAll(
        /<span\b[^>]*data-estado="[^"]+"[^>]*title="[^"]+"[^>]*><svg\b[^>]*>.*?<\/svg>([^<]+)<\/span>/g,
      ),
    ].map(([, nome]) => nome)
    expect(nomes.length).toBeGreaterThanOrEqual(8)
    expect(nomes.sort()).toEqual(dados.funcionarios.valor!.map(f => f.curto).sort())
    expect(html).toContain('data-sala="patrimonio" data-destaque="true"')
    expect(css).toMatch(/\.rumo-maquete\s*\{[^}]*min-block-size: 245px/)
    expect(css).not.toMatch(/\.rumo-maquete[^{}]*\{[^}]*(?:overflow:\s*hidden|margin-block:\s*-)/)
  })

  it('reserva até cinco ocorrências para a primeira tela móvel e até oito para todo o desktop', () => {
    const celular = render()
    const desktop = render({ dispositivo: 'desktop' })
    // O escritório vem antes dos motores em 375 × 812. A margem da contagem inclui
    // o primeiro motor inteiro se a fila do dia ou os estados ocuparem menos espaço.
    expect(celular.indexOf('Quem trabalha por você')).toBeLessThan(celular.indexOf('O que move o plano'))
    expect(desktop.indexOf('Quem trabalha por você')).toBeGreaterThan(desktop.indexOf('O que move o plano'))
    const fimDaMaximaFaixaMovel = celular.indexOf(
      '<article class="rumo-motor"',
      celular.indexOf('<article class="rumo-motor"') + 1,
    )
    expect(fimDaMaximaFaixaMovel).toBeGreaterThan(0)
    const faixaMovel = contar(celular.slice(0, fimDaMaximaFaixaMovel))
    expect(faixaMovel).toBe(4)
    expect(contar(desktop)).toBe(6)
    const ocorrencias = [...desktop.matchAll(/data-numero-financeiro="true"[^>]*>(.*?)<\/span>/g)].map(m => texto(m[1]))
    expect(new Set(ocorrencias).size).toBe(ocorrencias.length)
  })

  it('oculta texto, marcadores, atributos e geometria pelo olho da casca e pela prop', () => {
    const comTextoPrivado = structuredClone(dados)
    comTextoPrivado.pendencias.fila = {
      ...comTextoPrivado.pendencias.fila,
      estado: 'pronto',
      valor: [
        {
          id: 'tarefa-privada',
          funcionario: 'contador',
          perguntaCurta: 'Conferir 76543,21 ou 98,7% (R$ 7.654,32)',
          valor: dados.saldoConta,
        },
      ],
    }
    const aberto = render({ dados: comTextoPrivado })
    expect(aberto).toContain('76543,21')
    expect(aberto).toContain('class="rumo-cobertura"')
    for (const fechado of [
      render({ dados: comTextoPrivado, oculto: true }),
      render({ dados: comTextoPrivado }, true),
    ]) {
      expect(contar(fechado)).toBe(0)
      expect(fechado).not.toMatch(/R\$|\d\s*%|76543|class="rumo-(?:cobertura|posicao|haste)"|Você está aqui|pathLength/)
      expect(fechado).toContain('Marcos do calendário')
      const valores = [...aberto.matchAll(/data-numero-financeiro="true"[^>]*>(.*?)<\/span>/g)]
      for (const [, valor] of valores) {
        const digitos = valor.match(/\d[\d.,]*/)?.[0]
        expect(digitos).toBeDefined()
        // Coordenadas estáticas das ilustrações podem coincidir com decimais curtos.
        const semDesenho = fechado.replace(/ (?:d|points)="[^"]*"/g, '')
        expect(semDesenho.includes(digitos!)).toBe(false)
      }
      expect(fechado).toContain('aria-label="Valor oculto"')
      expect(fechado).not.toMatch(/<meter\b|<progress\b|aria-value(?:now|text)=/)
    }
  })

  it('mostra os estados ausentes e conserva zero quando o campo está pronto', () => {
    const semDados = structuredClone(dados)
    semDados.plano2029.faltamPorMesComMargem = {
      ...dados.plano2029.faltamPorMesComMargem,
      estado: 'indisponivel',
      valor: null,
    }
    semDados.plano2029.faltamPorMesSemMargem = {
      ...dados.plano2029.faltamPorMesSemMargem,
      estado: 'vazio',
      valor: null,
    }
    semDados.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'indisponivel', valor: null }
    semDados.aplicacoes.rendeuHoje = { ...dados.aplicacoes.rendeuHoje, estado: 'vazio', valor: null }
    semDados.imoveis.aluguelLiquidoEstimado = { ...dados.imoveis.aluguelLiquidoEstimado, estado: 'pronto', valor: 0 }
    semDados.funcionarios = { ...dados.funcionarios, estado: 'indisponivel', valor: null }
    const html = render({ dados: semDados })
    expect(html.match(/Ainda sem dado/g)).toHaveLength(3)
    expect(texto(html)).toContain('rendeu hojeSem registros')
    expect(html).not.toMatch(/class="rumo-(?:cobertura|posicao|haste)"/)
    expect(texto(html)).toContain('aluguel líquido estimadoR$ 0,00')
    expect(html.match(/cf-ilustracao\b/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('restringe a vista do Assessor da Casa às tarefas da casa', () => {
    const equipe = structuredClone(dados)
    equipe.pessoa.papel = { ...equipe.pessoa.papel, estado: 'pronto', valor: 'equipe' }
    equipe.pendencias.fila = {
      ...equipe.pendencias.fila,
      estado: 'pronto',
      valor: [
        { id: 'estoque:exemplo', funcionario: 'auditor', perguntaCurta: 'R$ 7.654,32', valor: dados.saldoConta },
        { id: 'fatura:exemplo', funcionario: 'cartao', perguntaCurta: 'Tarefa financeira', valor: dados.saldoConta },
      ],
    }
    const html = render({ dados: equipe })
    expect(texto(html)).toContain('Tarefas da casa')
    expect(texto(html)).toContain('Contar o estoque da casa')
    expect(html.match(/<h1\b/g)).toHaveLength(1)
    expect(html).not.toMatch(/R\$|Tarefa financeira|rumo-heroi|rumo-escritorio|rumo-orcamento/)
    equipe.pendencias.fila.valor.shift()
    expect(render({ dados: equipe })).toContain('Nada pendente por aqui.')
  })

  it('segue a posição visual da navegação na ordem de leitura de cada dispositivo', () => {
    const celular = render()
    const desktop = render({ dispositivo: 'desktop' })
    expect(celular.indexOf('class="rumo-nav"')).toBeGreaterThan(celular.indexOf('class="rumo-corpo"'))
    expect(desktop.indexOf('class="rumo-nav"')).toBeLessThan(desktop.indexOf('class="rumo-corpo"'))
  })

  it('prioriza risco e operação e oferece acesso à fila restante com pílulas nominadas', () => {
    const exemplo = structuredClone(dados)
    exemplo.alertas = {
      ...exemplo.alertas,
      estado: 'pronto',
      valor: [
        { id: 'lembrete:a', nivel: 'lembrete', texto: 'Revisão da casa' },
        { id: 'feira_nota:b', nivel: 'operacao', texto: 'Conferir a nota' },
        { id: 'fatura:c', nivel: 'dinheiro em risco', texto: 'Resolver a fatura' },
      ],
    }
    exemplo.pendencias.fila = {
      ...exemplo.pendencias.fila,
      estado: 'pronto',
      valor: exemplo.alertas.valor.map(a => ({
        id: a.id,
        perguntaCurta: a.texto,
        funcionario: 'secretaria',
        valor: dados.saldoConta,
      })),
    }
    const html = render({ dados: exemplo })
    expect(html).toContain('Há dinheiro em risco.')
    expect(html.indexOf('Resolver a fatura')).toBeGreaterThan(0)
    expect(html.indexOf('Resolver a fatura')).toBeLessThan(html.indexOf('Conferir a nota'))
    expect(html).toContain('Ver mais tarefas')
    expect(html).not.toContain('Revisão da casa')
    exemplo.pendencias.fila.valor = exemplo.pendencias.fila.valor.slice(0, 1)
    expect(render({ dados: exemplo })).toContain('Lembrete')
  })

  it('exige nome e alvo mínimo nos controles e oculta ilustrações decorativas da leitura assistiva', () => {
    const html = render()
    const botoes = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)]
    const regraAlvos = css.match(
      /\.rumo button\.rumo-acao, \.rumo button\.rumo-aba, \.rumo button\.rumo-avatar\s*\{([^}]*)\}/,
    )?.[1]
    expect(regraAlvos).toMatch(/min-inline-size: 44px/)
    expect(regraAlvos).toMatch(/min-block-size: 44px/)
    expect(botoes.length).toBeGreaterThanOrEqual(9)
    for (const [, atributos, corpo] of botoes) {
      expect(atributos).toMatch(/class="rumo-(?:acao|aba|avatar)(?: |")/)
      expect(atributos.match(/aria-label="([^"]+)"/)?.[1] ?? texto(corpo)).not.toBe('')
    }
    expect(css).toMatch(/\.rumo-cenario summary\s*\{[^}]*min-block-size: 44px/)
    expect(css).toMatch(/\.rumo-cenario summary:focus-visible\s*\{[^}]*outline: 2px solid var\(--rumo-verde-heroi\)/)
    const semDados = structuredClone(dados)
    semDados.aplicacoes.rendeuHoje = { ...dados.aplicacoes.rendeuHoje, estado: 'vazio', valor: null }
    const figuras = [
      ...render({ dados: semDados }).matchAll(/<svg\b[^>]*class="(?:cf-ilustracao|rumo-trilha)[^"]*"[^>]*>/g),
    ]
    expect(figuras.length).toBeGreaterThanOrEqual(2)
    for (const [figura] of figuras) expect(figura).toContain('aria-hidden="true"')
  })

  it('usa superfície sólida e ícones do projeto dentro das regras de acabamento', () => {
    expect(css).toContain('--raio-grande: 12px')
    expect(css).toMatch(/font-variant-numeric: tabular-nums/)
    expect(css).toMatch(/focus-visible\s*\{\s*outline:\s*2px solid var\(--destaque\)/)
    expect(css).toContain('prefers-reduced-motion: reduce')
    expect(css).not.toMatch(
      /gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-left|border-inline-start:\s*\d+px\s+solid\s+var\(--(?:destaque|risco)/i,
    )
    const html = render()
    expect(html).toContain('lucide')
    expect(html).not.toMatch(/\p{Extended_Pictographic}|<(?:linearGradient|radialGradient|filter)\b/u)
  })
})

function tokens(bloco: string) {
  return Object.fromEntries([...bloco.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map(([, nome, hex]) => [nome, hex]))
}

function luminancia(hex: string) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)!
    .map(par => {
      const srgb = Number.parseInt(par, 16) / 255
      return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4
    })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(frente: string, fundo: string) {
  const a = luminancia(frente)
  const b = luminancia(fundo)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

it.each(['claro', 'escuro'])('alcança contraste AA nos pares de texto do tema %s', tema => {
  const blocos = css.split('}')
  const claro = tokens(blocos[0])
  const paleta = tema === 'escuro' ? { ...claro, ...tokens(blocos[1]) } : claro
  const pares: [string, string][] = [
    ['texto', 'fundo'],
    ['texto', 'cartao'],
    ['texto', 'menu'],
    ['texto-secundario', 'fundo'],
    ['texto-secundario', 'cartao'],
    ['texto-secundario', 'menu'],
    ['destaque', 'fundo'],
    ['destaque', 'menu'],
    ['destaque', 'cartao'],
    ['sobre-destaque', 'destaque'],
    ['risco', 'menu'],
    ['risco', 'cartao'],
    ['rumo-texto-heroi', 'rumo-heroi'],
    ['rumo-suave-heroi', 'rumo-heroi'],
    ['rumo-verde-heroi', 'rumo-heroi'],
    ['rumo-verde-heroi', 'rumo-fundo-trilha'],
    ['rumo-texto-heroi', 'rumo-fundo-trilha'],
    ['rumo-suave-heroi', 'rumo-fundo-trilha'],
  ]
  for (const [frente, fundo] of pares) {
    expect(contraste(paleta[frente], paleta[fundo]), `${frente} / ${fundo}`).toBeGreaterThanOrEqual(4.5)
  }
  expect(contraste(paleta['rumo-piso-trilha'], paleta['rumo-fundo-trilha'])).toBeGreaterThanOrEqual(3)
})
