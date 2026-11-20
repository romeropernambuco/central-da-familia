import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
// @ts-ignore Leitura de código fonte apenas no processo de teste.
import { readFileSync } from 'node:fs'
import type { Dispositivo, Tema } from '../Propostas'
import { PrivacidadePropostas } from '../../componentes/escritorio/privacidade'
import { carregarDadosInicio, type DadosInicio } from '../../componentes/escritorio/dadosDeExemplo'
import { Proposta } from './Proposta'
import { chromium, verificarNavegador } from './verificarNavegador'

let exemplo: DadosInicio
const css = String(readFileSync(new URL('./proposta.css', import.meta.url), 'utf8'))
const textoPrivado = 'Conferir R$ 21.293,82 com 73,25% de cobertura e proporção 31/79'

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-17T11:20:00Z'))
  exemplo = await carregarDadosInicio()
})
afterAll(() => vi.useRealTimers())

function renderizar(tema: Tema, dispositivo: Dispositivo, dados = exemplo, oculto = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: oculto },
      createElement(Proposta, { tema, dispositivo, dados }),
    ),
  )
}

function comTarefaPrivada() {
  const dados = structuredClone(exemplo)
  dados.pendencias.fila = {
    ...dados.pendencias.fila,
    estado: 'pronto',
    valor: [
      {
        id: 'revisao-privada',
        funcionario: dados.funcionarios.valor![0].id,
        perguntaCurta: textoPrivado,
        valor: { estado: 'pronto', valor: 98765.43, unidade: 'reais', natureza: 'previsto' },
      },
    ],
  }
  dados.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'pronto', valor: 73.25 }
  return dados
}

it.each([
  ['claro', 'celular'],
  ['escuro', 'celular'],
  ['claro', 'desktop'],
  ['escuro', 'desktop'],
] as const)('renderiza %s em %s com a ordem da Central e um único h1', (tema, dispositivo) => {
  const html = renderizar(tema, dispositivo)
  expect(html).toContain(`data-tema="${tema}" data-dispositivo="${dispositivo}"`)
  expect(html.match(/<h1\b/g)).toHaveLength(1)
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  const secoes =
    dispositivo === 'celular'
      ? ['m-referencias"', 'm-escritorio"', 'm-fila"', 'm-rumo"', 'm-motores"', 'm-bento"']
      : ['m-escritorio"', 'm-fila"', 'm-rumo"', 'm-bento"', 'm-referencias"']
  let ultima = -1
  for (const secao of secoes) {
    const posicao = html.indexOf(secao)
    expect(posicao).toBeGreaterThan(ultima)
    ultima = posicao
  }
  expect(html.match(/class="m-referencia"/g)).toHaveLength(4)
  expect(html.match(/class="m-cartao m-ilustrado"/g)).toHaveLength(dispositivo === 'celular' ? 5 : 2)
  expect(html).toMatch(/>2026<.*>2027<.*>2028<.*>2029</)
  expect(html).toContain('Viver de rendimentos')
})

it('retira o texto livre e a geometria do avanço quando o olho fecha', () => {
  const dados = comTarefaPrivada()
  const aberto = renderizar('claro', 'celular', dados)
  expect(aberto).toContain(textoPrivado)
  expect(aberto).toMatch(/class="m-posicao" cx="141[^"]*"/)
  expect(renderizar('claro', 'desktop', dados)).toMatch(/class="m-posicao" cx="226[^"]*"/)
  expect(aberto).toContain('class="m-avanco"')
  const fechado = renderizar('claro', 'celular', dados, true)
  expect(fechado).toContain('aria-label="Valor oculto"')
  expect(fechado).toContain('class="m-caminho"')
  expect(fechado).toContain('Tarefa pendente')
  expect(fechado).not.toMatch(
    /R\$|21\.293,82|73,25%|73,3|31\/79|98\.765,43|m-posicao|m-avanco|data-numero-financeiro|<progress|<meter|aria-valuenow/,
  )
})

it('protege o Assessor da Casa mesmo com um snapshot financeiro completo e o olho aberto', () => {
  const dados = comTarefaPrivada()
  dados.pessoa.papel = { ...dados.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  for (const dispositivo of ['desktop', 'celular'] as const) {
    const html = renderizar('escuro', dispositivo, dados)
    expect(html).toContain('<h1>Assessor da Casa</h1>')
    expect(html).not.toMatch(/R\$|Rumo a 2029|m-posicao|m-fila|m-referencia|31\/79|data-numero-financeiro/)
  }
})

it('mostra zero apenas se informado e usa exclusivamente a diferença com margem', () => {
  const dados = structuredClone(exemplo)
  dados.hojePodeGastar.valor = { ...dados.hojePodeGastar.valor, estado: 'vazio', valor: null }
  dados.faturas.total = { ...dados.faturas.total, estado: 'pronto', valor: 0 }
  dados.plano2029.progressao = { ...dados.plano2029.progressao, estado: 'indisponivel', valor: null }
  dados.plano2029.faltamPorMesComMargem = { ...dados.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -234567 }
  dados.plano2029.faltamPorMesSemMargem = { ...dados.plano2029.faltamPorMesSemMargem, estado: 'pronto', valor: 987654 }
  const html = renderizar('escuro', 'desktop', dados)
  expect(html.match(/Ainda sem dado/g)?.length).toBeGreaterThanOrEqual(2)
  expect(html.match(/R\$\s*0,00/g)).toHaveLength(1)
  expect(html).toMatch(/R\$\s*2\.345,67/)
  expect(html).toContain('Sobra mensal com margem')
  expect(html).not.toMatch(/9\.876,54|m-posicao/)
  expect(renderizar('escuro', 'desktop', dados, true)).not.toContain('Sobra mensal')
})

it('prioriza os três níveis de alerta com uma pílula nomeada para cada nível', () => {
  const dados = comTarefaPrivada()
  const niveis = ['lembrete', 'operacao', 'dinheiro em risco'] as const
  const tarefa = dados.pendencias.fila.valor![0]
  dados.pendencias.fila.valor = niveis.map(nivel => ({ ...tarefa, id: nivel }))
  dados.alertas = { ...dados.alertas, estado: 'pronto', valor: niveis.map(nivel => ({ id: nivel, nivel, texto: '' })) }
  const html = renderizar('claro', 'desktop', dados)
  const rotulos = [...html.matchAll(/class="m-nivel"[^>]*>.*?<\/svg>([^<]+)/g)].map(item => item[1])
  expect(rotulos).toEqual(['Dinheiro em risco', 'Operação', 'Lembrete'])
  expect(html).toContain('Há um vencimento que pede atenção.')
})

it('usa a API compartilhada, com toda a equipe e sem balões financeiros', () => {
  const codigo = String(readFileSync(new URL('./Escritorio.tsx', import.meta.url), 'utf8'))
  expect(codigo).toContain("from '../../componentes/escritorio/Escritorio3D'")
  expect(codigo).not.toMatch(/EscritorioMaquete|\bvalores=/)
  expect(codigo).toMatch(/<Escritorio3D\s+completo[\s\S]*variante="grande"/)
  const html = renderizar('claro', 'desktop')
  expect(html).toContain('class="m-palco"')
  const equipe = html.match(/<ul class="m-equipe">(.*?)<\/ul>/)?.[1] ?? ''
  for (const funcionario of exemplo.funcionarios.valor!) {
    expect(equipe).toContain(funcionario.nome)
  }
  const dados = structuredClone(exemplo)
  for (const [i, pessoa] of dados.funcionarios.valor!.entries()) {
    pessoa.estadoHoje = { ...pessoa.estadoHoje, estado: 'pronto', valor: i === 0 ? 'trabalhando' : 'entregue' }
  }
  expect(renderizar('claro', 'desktop', dados)).toContain('1 pessoa trabalhando')
})

it('entrega a fila inteira no celular e abre com a planta toda nos dois dispositivos', () => {
  const dados = comTarefaPrivada()
  const tarefa = dados.pendencias.fila.valor![0]
  dados.pendencias.fila.valor = Array.from({ length: 6 }, (_, indice) => ({
    ...tarefa,
    id: 'tarefa-' + indice,
    perguntaCurta: 'Decisão ' + (indice + 1),
  }))
  const celular = renderizar('claro', 'celular', dados)
  const desktop = renderizar('claro', 'desktop', dados)
  expect(celular.match(/class="m-tarefa"/g)).toHaveLength(6)
  expect(celular).toContain('Decisão 6')
  for (const html of [celular, desktop]) {
    expect(html).toContain('aria-pressed="true">Todas</button>')
    expect(html.match(/class="maquete-posto"/g)).toHaveLength(19)
  }
  expect(celular).not.toContain('Ver fila completa')
  expect(desktop.match(/class="m-tarefa"/g)).toHaveLength(3)
  expect(desktop).toContain('Ver fila completa')
  expect(desktop).not.toMatch(/m-abertura|m-motores/)
})

it('tem alvo mínimo, destaque verde, tipografia tabular, ilustrações escondidas e movimento reduzido', () => {
  const html = renderizar('claro', 'celular')
  const ilustracoes = [...html.matchAll(/class="m-arte" aria-hidden="true"/g)]
  expect(ilustracoes).toHaveLength(5)
  expect(html).toMatch(/class="m-trilha"[^>]*aria-hidden="true"/)
  expect(html).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(css).toMatch(/\.m-central \.m-alvo\s*\{[^}]*min-inline-size: 44px;[^}]*min-block-size: 44px;/)
  expect(css).toMatch(/\.m-numero-principal \{ font-size: 35px; \}/)
  expect(css).toMatch(/tabular-nums; white-space: nowrap;/)
  expect(css).toMatch(/:focus-visible[^}]*outline: 2px solid var\(--destaque\)/)
  expect(css).toMatch(/prefers-reduced-motion: reduce[^]*animation: none/)
  expect(css).toMatch(/\.m-nivel\[data-nivel="dinheiro em risco"\][^}]*var\(--risco\)/)
  expect(css).not.toMatch(/gradient\s*\(|backdrop-filter|background-clip:\s*text|border-(left|inline-start)\s*:|neon/i)
})

it.skipIf(!chromium)(
  'mede o layout e aciona menu, funcionário e fila no Chromium',
  async () => {
    const { medicoes, passos } = await verificarNavegador(comTarefaPrivada())
    expect(medicoes).toHaveLength(8)
    for (const [i, medida] of medicoes.entries()) {
      expect([medida.largura, medida.altura]).toEqual(
        [
          [375, 812],
          [390, 844],
          [1280, 800],
          [1440, 800],
        ][i % 4],
      )
      expect(medida, JSON.stringify(medida)).toMatchObject({
        semTransbordo: true,
        numerosInteiros: true,
        menuFixo: true,
        ordem: true,
      })
      expect(medida.controles.length).toBeGreaterThan(10)
      expect(medida.controles.filter(item => item.largura < 44 || item.altura < 44 || !item.nome.trim())).toEqual([])
      expect(medida.contraste).toBeGreaterThanOrEqual(4.5)
      if (medida.largura < 400) {
        expect(medida.secoes).toHaveLength(5)
        expect(Math.min(...medida.secoes)).toBeGreaterThanOrEqual(medida.altura * 0.85)
        expect(medida.cena).toBeGreaterThanOrEqual(medida.altura)
        expect(medida.contrasteTrilha).toBeGreaterThanOrEqual(3)
        expect(medida.fimVisivel).toBe(true)
        expect(medida.numeros).toHaveLength(3)
        expect(medida.referenciasNaDobra).toBe(4)
      } else {
        expect(medida.cena).toBeGreaterThanOrEqual(510)
        expect(medida.numeros).toHaveLength(3)
      }
      console.info(`M · ${i < 4 ? 'claro' : 'escuro'} · ${medida.largura}px · ${medida.numeros.length} acima da dobra`)
    }
    expect(passos).toEqual({
      Orçamento: true,
      Faturas: true,
      Escritório: true,
      Início: true,
      mais: true,
      cena: true,
      postoFocavel: true,
      ficha: true,
      fechar: true,
      detalhe: true,
      olho: true,
      feita: true,
      desfeita: true,
      adiada: true,
      retomada: true,
      sala: true,
      panorama: true,
      fichaOculta: true,
      idaEVolta: true,
    })
  },
  30000,
)
