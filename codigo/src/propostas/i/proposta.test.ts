import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it, vi } from 'vitest'
import ts from 'typescript'
import { carregarDadosInicio, type DadosInicio, type NivelAlerta } from '../dadosExemplo'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { Proposta } from './Proposta'
import { medirNoChromium, chrome } from './verificarChromium'

const css = ts.sys.readFile('src/propostas/i/bento.css')!
const cenarios = (['claro', 'escuro'] as const).flatMap(tema =>
  (['celular', 'desktop'] as const).map(dispositivo => ({ tema, dispositivo })))
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
let dados: DadosInicio

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T14:00:00Z'))
  try { dados = await carregarDadosInicio() } finally { vi.useRealTimers() }
})

function render(cenario = cenarios[0], snapshot = dados, oculto = false, olhoDaCasca = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: olhoDaCasca },
    createElement(Proposta, { ...cenario, dados: snapshot, oculto })))
}

function comDecisoes() {
  const copia = structuredClone(dados)
  const decisoes = [
    { id: 'lembrete:aviso', nivel: 'lembrete', texto: 'Retomar lembrete', valor: 249.03 },
    { id: 'estoque:lista', nivel: 'operacao', texto: 'Conferir estoque de R$ 87.512,31, 77,3% e razão 17/19', valor: 87512.31 },
    { id: 'fatura:97.236,42', nivel: 'dinheiro em risco', texto: 'Revisar cobrança', valor: 97236.42 },
  ] satisfies { id: string; nivel: NivelAlerta; texto: string; valor: number }[]
  copia.alertas = { ...copia.alertas, estado: 'pronto', valor: decisoes.map(({ id, nivel, texto }) => ({ id, nivel, texto })) }
  copia.pendencias.fila = { ...copia.pendencias.fila, estado: 'pronto', valor: decisoes.map(({ id, texto, valor }) => ({
    id, perguntaCurta: texto, funcionario: 'fiscal', valor: { ...dados.faturas.total, estado: 'pronto', valor },
  })) }
  copia.plano2029.progressao = { ...copia.plano2029.progressao, estado: 'pronto', valor: 61.7 }
  copia.imoveis.aluguelLiquidoEstimado = { ...copia.imoveis.aluguelLiquidoEstimado, estado: 'pronto', valor: 810239 }
  return copia
}

it.each(cenarios)('renderiza o Bento Completo no $tema em $dispositivo', cenario => {
  const html = render(cenario)
  expect(html).toContain('data-tema="' + cenario.tema + '" data-dispositivo="' + cenario.dispositivo + '"')
  expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  expect(html).toContain('Resumo financeiro')
  expect(html).toContain('Limite de hoje')
  expect(html).toContain('Falta mensal com margem')
  expect(html).toContain(brl.format(dados.plano2029.faltamPorMesComMargem.valor! / 100))
  expect(html).toContain('Viver de rendimentos')
  expect(html).toContain('>2026<')
  expect(html).toContain('>2029<')
  expect(html).toContain('data-variante="' + (cenario.dispositivo === 'celular' ? 'media' : 'grande') + '"')
  expect(html.match(/class="maquete-posto" aria-label="[^"]+"/g)).toHaveLength(19)
  expect(html.match(/class="maquete-placa/g)).toHaveLength(19)
})

it('prioriza risco e operação e limita o resumo da fila a duas decisões', () => {
  const html = render(cenarios[0], comDecisoes())
  expect(html.match(/class="i-decisao"/g)).toHaveLength(2)
  expect(html).toMatch(/Dinheiro em risco[\s\S]*Operação/)
  expect(html).not.toContain('Retomar lembrete')
  for (const acao of ['Ver todos', 'Já fiz', 'Depois', 'Abrir']) expect(html).toContain(acao)
})

it('protege o olho da casca e a prop local, inclusive valor, texto livre e geometria da trilha', () => {
  const copia = comDecisoes()
  const aberto = render(cenarios[0], copia)
  expect(aberto).toContain('class="i-cobertura"')
  expect(aberto).toContain('class="i-posicao"')
  expect(aberto).toMatch(/61,7<span class="numero-simbolo">%/)
  expect(aberto).toContain('maquete-balao')
  expect(aberto).toContain(brl.format(8102.39))
  expect(aberto).toContain('Conferir o estoque')
  expect(aberto.split(brl.format(87512.31))).toHaveLength(2)

  for (const cenario of cenarios) {
    const fechado = render(cenario, copia, true)
    expect(fechado).toBe(render(cenario, copia, false, true))
    expect(fechado).toContain('class="i-caminho"')
    expect(fechado).toMatch(/class="maquete-balao"[^>]*><span aria-label="Valor oculto">/)
    expect(fechado).not.toMatch(/R\$|data-numero-financeiro|i-cobertura|i-posicao|i-haste|Você está aqui|61,7|77,3|17\/19|97\.236|8\.102/)
    const outra = structuredClone(copia)
    outra.plano2029.progressao = { ...outra.plano2029.progressao, estado: 'pronto', valor: 100 }
    outra.imoveis.aluguelLiquidoEstimado = { ...outra.imoveis.aluguelLiquidoEstimado, estado: 'pronto', valor: 123456 }
    expect(render(cenario, outra, true)).toBe(fechado)
  }
})

it('limita o Assessor a tarefas domésticas e mantém valores fora da marcação', () => {
  const copia = comDecisoes()
  copia.pessoa.papel = { ...copia.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const html = render(cenarios[1], copia)
  expect(html).toContain('Conferir o estoque')
  expect(html).not.toMatch(/Revisar cobrança|Retomar lembrete|R\$|data-numero-financeiro|i-trilha|maquete-balao|17\/19/)
  expect(html).toContain('Foco por sala')
})

it('mantém apenas o orçamento próprio para o papel pessoa', () => {
  const copia = comDecisoes()
  copia.pessoa.papel = { ...copia.pessoa.papel, estado: 'pronto', valor: 'pessoa' }
  const html = render(cenarios[1], copia)
  expect(html).toContain('Limite de hoje')
  expect(html).toContain('Disponível até domingo')
  expect(html).not.toMatch(/Total aplicado|Faturas previstas|Maquete isométrica|Rumo a 2029|i-decisao/)
})

it('mostra a sobra sem sinal negativo e esconde a direção do plano com o olho fechado', () => {
  const copia = comDecisoes()
  copia.plano2029.faltamPorMesComMargem = { ...copia.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -185673 }
  const html = render(cenarios[0], copia)
  expect(html).toContain('Sobra mensal com margem')
  expect(html).toContain(brl.format(1856.73))
  expect(html).not.toContain(brl.format(-1856.73))
  expect(render(cenarios[0], copia, true)).toContain('Diferença mensal com margem')
  expect(render(cenarios[0], copia, true)).not.toMatch(/Sobra mensal|Falta mensal/)
})

it('trata ausência como ainda sem dado e mostra quantias iguais uma vez', () => {
  const copia = comDecisoes()
  copia.hojePodeGastar.valor = { ...copia.hojePodeGastar.valor, estado: 'pronto', valor: 4567.89 }
  copia.hojePodeGastar.ateDomingo = { ...copia.hojePodeGastar.ateDomingo, estado: 'pronto', valor: 4567.89 }
  copia.aplicacoes.rendeuHoje = { ...copia.aplicacoes.rendeuHoje, estado: 'indisponivel', valor: null }
  copia.faturas.proximas = { ...copia.faturas.proximas, estado: 'vazio', valor: null }
  copia.plano2029.progressao = { ...copia.plano2029.progressao, estado: 'vazio', valor: null }
  const html = render(cenarios[0], copia)
  expect(html.split(brl.format(4567.89))).toHaveLength(2)
  expect(html).toContain('Valor já mostrado')
  expect(html.match(/Ainda sem dado/g)?.length).toBeGreaterThanOrEqual(3)
  expect(html).not.toMatch(/class="i-(?:posicao|cobertura)"/)
})

it('usa traço sólido de 15 px, tipografia tabular, foco e arte decorativa', () => {
  const html = render(cenarios[0], comDecisoes())
  expect(css).toMatch(/\.i-curva path\s*\{[^}]*stroke-width:\s*15px/)
  expect(css).toMatch(/\.i-primario\s*\{\s*font-size:\s*36px/)
  expect(css).toMatch(/\.numero-simbolo\s*\{\s*font-size:\s*\.65em/)
  expect(css).toMatch(/\.numero-financeiro\s*\{[^}]*white-space:\s*nowrap[^}]*tabular-nums/)
  expect(css).toContain(':focus-visible')
  expect(css).toContain('prefers-reduced-motion: reduce')
  expect(html.match(/<svg class="(?:escritorio-maquete|i-curva)[^>]+aria-hidden="true"/g)).toHaveLength(2)
  expect(html.match(/class="i-arte(?:-plano)?" aria-hidden="true"/g)).toHaveLength(4)
  expect(css + html).not.toMatch(/gradient\(|backdrop-filter|background-clip:\s*text|text-shadow|border-(?:left|inline-start)\s*:|\p{Extended_Pictographic}/u)
})

function luminancia(hex: string) {
  const [r, g, b] = hex.slice(1).match(/../g)!.map(par => {
    const canal = parseInt(par, 16) / 255
    return canal <= 0.04045 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4
  })
  return r * 0.2126 + g * 0.7152 + b * 0.0722
}

it('calcula contraste AA dos pares de texto, risco, foco e seleção nos dois temas', () => {
  function tokens(seletor: RegExp) {
    return Object.fromEntries([...css.match(seletor)![1].matchAll(/--([\w-]+): (#[0-9a-f]{6});/g)]
      .map(([, nome, cor]) => [nome, luminancia(cor)]))
  }
  const claro = tokens(/\.i-inicio \{([^}]+)\}/)
  const escuro = { ...claro, ...tokens(/\.i-inicio\[data-tema="escuro"\] \{([^}]+)\}/) }
  for (const tema of [claro, escuro]) {
    function testar(tinta: string, base: string, minimo: number) {
      const maior = Math.max(tema[tinta], tema[base])
      const menor = Math.min(tema[tinta], tema[base])
      expect((maior + 0.05) / (menor + 0.05), tinta + ' sobre ' + base).toBeGreaterThanOrEqual(minimo)
    }
    for (const base of ['fundo', 'cartao', 'menu', 'palco', 'aplicacoes', 'faturas']) {
      testar('texto', base, 4.5)
      testar('texto-secundario', base, 4.5)
      testar('destaque', base, 4.5)
    }
    testar('risco', 'cartao', 4.5)
    testar('risco', 'menu', 4.5)
    testar('sobre-destaque', 'destaque', 4.5)
    testar('trilha-base', 'palco', 3)
    testar('ponto', 'trilha-base', 3)
  }
})

it.skipIf(!chrome)('mede na casca e exercita navegação, maquete e fila montadas no Chromium', async () => {
  const { medicoes, verificacoes } = await medirNoChromium([dados, comDecisoes()], cenarios)
  expect(medicoes).toHaveLength(cenarios.length * 2)
  for (const [i, medicao] of medicoes.entries()) {
    const cenario = cenarios[i % cenarios.length]
    expect(medicao.semTransbordo).toBe(true)
    expect(medicao.menuVisivel).toBe(true)
    expect(medicao.valores.length).toBeGreaterThanOrEqual(cenario.dispositivo === 'celular' ? 1 : 4)
    expect(medicao.valores.length, medicao.valores.join(' · ')).toBeLessThanOrEqual(cenario.dispositivo === 'celular' ? 5 : 8)
    expect(new Set(medicao.valores).size).toBe(medicao.valores.length)
    expect(medicao.controles.length).toBeGreaterThanOrEqual(32)
    for (const controle of medicao.controles) {
      expect(controle.nome).not.toBe('')
      expect(controle.altura, controle.nome).toBeGreaterThanOrEqual(44)
      expect(controle.largura, controle.nome).toBeGreaterThanOrEqual(44)
    }
    console.info('I ' + (i < cenarios.length ? 'exemplo' : 'com decisões') + ' ' + cenario.tema + ' ' +
      cenario.dispositivo + ': ' + medicao.valores.length + ' números acima da dobra')
  }
  for (const [nome, verificacao] of Object.entries(verificacoes)) expect(verificacao, nome).toBe(true)
  expect(Object.keys(verificacoes)).toHaveLength(15)
}, 30000)
