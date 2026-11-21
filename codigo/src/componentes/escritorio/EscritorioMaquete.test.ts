// @ts-ignore: teste executado no Node, fora dos tipos de navegador do app.
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi } from 'vitest'
import { EQUIPE } from '../../lib/escritorio/equipe'
import { carregarDadosInicio } from './dadosDeExemplo'
import { EscritorioMaquete, type PropsEscritorioMaquete } from './EscritorioMaquete'
import { projetar, salas } from './maquete-desenho'
import { PrivacidadePropostas } from './privacidade'

const dados = await carregarDadosInicio()
const estilos: string = readFileSync(new URL('./escritorio-maquete.css', import.meta.url), 'utf8')

function render(props: Partial<PropsEscritorioMaquete> = {}, olhoFechado = false) {
  return renderToStaticMarkup(
    createElement(
      PrivacidadePropostas.Provider,
      { value: olhoFechado },
      createElement(EscritorioMaquete, { funcionarios: dados.funcionarios, ...props }),
    ),
  )
}

it('desenha os 19 postos nas sete salas e permite ligar todas as plaquinhas', () => {
  const html = render({ mostrarPlaquinhas: true })
  expect([...html.matchAll(/data-funcionario="([^"]+)"/g)].map(m => m[1]).sort()).toEqual(EQUIPE.map(f => f.id).sort())
  expect(EQUIPE).toHaveLength(19)
  expect(html.match(/data-sala=/g)).toHaveLength(7)
  expect(html.match(/class="maquete-placa maquete-rotulo"/g)).toHaveLength(19)
  expect(render()).not.toContain('maquete-placa maquete-rotulo')
  expect(render({ funcionarios: { ...dados.funcionarios, estado: 'vazio', valor: null } })).not.toContain(
    'data-funcionario=',
  )
})

it('usa o estado atual do snapshot, inclusive quando indisponível', () => {
  const estados = ['trabalhando', 'precisa_de_voce', 'entregue', 'vai_comecar', null] as const
  const funcionarios = structuredClone(dados.funcionarios)
  const amostra = funcionarios.valor!.slice(0, estados.length)
  amostra.forEach((f, i) => {
    const valor = estados[i]
    f.estadoHoje = {
      ...f.estadoHoje,
      ...(valor ? { estado: 'pronto', valor } : { estado: 'indisponivel', valor: null }),
    }
  })
  const html = render({ funcionarios, mostrarPlaquinhas: true })
  amostra.forEach((f, i) =>
    expect(html).toContain(`data-funcionario="${f.id}" data-estado="${estados[i] ?? 'indisponivel'}"`),
  )
  expect(html).toContain('lucide-keyboard')
  expect(html).toContain('lucide-bell-ring')
  expect(html).toContain('lucide-check')
  expect(html).toContain('lucide-pause')
  expect(html).toContain('Estado indisponível')
})

it('desenha os sinais nos próprios postos, com marcador exclusivo de quem pede atenção', () => {
  const funcionarios = structuredClone(dados.funcionarios)
  const amostra = funcionarios.valor!.slice(0, 4)
  const estados = ['trabalhando', 'vai_comecar', 'entregue', 'precisa_de_voce'] as const
  amostra.forEach((f, i) => {
    f.estadoHoje = { ...f.estadoHoje, estado: 'pronto', valor: estados[i] }
  })
  const html = render({ funcionarios: { ...funcionarios, estado: 'pronto', valor: amostra } })
  const postos = [...html.matchAll(/<g data-funcionario="[^"]+"[^>]*>[\s\S]*?<\/g>/g)].map(m => m[0])
  expect(postos).toHaveLength(amostra.length)
  const desenho = (estado: string) => postos.find(p => p.includes(`data-estado="${estado}"`))!
  expect(desenho('trabalhando')).toContain('class="maquete-maos"')
  expect(desenho('vai_comecar')).toMatch(/href="[^"]+-cafe"/)
  expect(desenho('entregue')).toContain('class="maquete-entrega"')
  expect(desenho('precisa_de_voce')).toContain('class="maquete-alerta"')
  expect(html.match(/class="maquete-alerta"/g)).toHaveLength(1)
  expect(html).not.toContain('maquete-sinal')
})

it('aproxima e centra qualquer sala, preserva os 19 postos e atenua as demais', () => {
  const vista = (html: string) =>
    html
      .match(/viewBox="([^"]+)"/)![1]
      .split(' ')
      .map(Number)
  const [, , larguraGeral] = vista(render())
  for (const sala of salas) {
    const html = render({ salaDestacada: sala.id, onSelecionar: vi.fn() })
    expect(html).toContain(`data-sala="${sala.id}" data-destaque="true" data-atenuada="false"`)
    expect(html.match(/data-sala="[^"]+" data-destaque="false" data-atenuada="true"/g)).toHaveLength(6)
    expect(html.match(/data-funcionario=/g)).toHaveLength(19)
    expect(html.match(/<button /g)).toHaveLength(EQUIPE.filter(f => f.sala === sala.id).length)
    const [x, , largura] = vista(html)
    expect(largura).toBeLessThan(larguraGeral)
    expect(x + largura / 2).toBe(projetar(sala.x + 92, sala.y + 73)[0])
  }
})

it('mascara valores pelo olho e pela prop, e remove os balões para o Assessor da Casa', () => {
  const props = { valores: { guardado: dados.aplicacoes.total }, mostrarPlaquinhas: true }
  const aberto = render(props)
  const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const total = moeda.format(dados.aplicacoes.total.valor!)
  expect(aberto).toContain('data-numero-financeiro="true"')
  expect(aberto).toContain(total)
  for (const html of [render({ ...props, oculto: true }), render({ ...props, oculto: false }, true)]) {
    expect(html).toContain('Valor oculto')
    expect(html).not.toMatch(/R\$|data-numero-financeiro/)
    expect(html).not.toContain(total)
  }
  const assessor = render({ ...props, papel: 'equipe' })
  expect(assessor).not.toMatch(/maquete-balao|R\$|data-numero-financeiro/)
})

it('usa botões nativos e nomeados fora do SVG decorativo e respeita as variantes', () => {
  const html = render({ onSelecionar: vi.fn(), variante: 'grande' })
  const fimSvg = html.lastIndexOf('</svg>')
  const botoes = html.slice(fimSvg).match(/<button type="button" class="maquete-posto" aria-label="[^"]+"/g)
  expect(botoes).toHaveLength(19)
  for (const f of dados.funcionarios.valor!) expect(botoes!.some(b => b.includes(f.nome))).toBe(true)
  expect(html).toMatch(/<svg [^>]*aria-hidden="true" focusable="false"/)
  expect(html).not.toMatch(/tabindex="-1"|<button[^>]*aria-hidden/)
  expect(render()).not.toContain('<button')
  expect(render()).toContain('data-variante="media"')
  expect(render({ variante: 'compacta' })).toContain('data-variante="compacta"')
  expect(html).toContain('data-variante="grande"')
  expect(estilos).toMatch(/\.maquete-posto\s*\{[^}]*inline-size:\s*44px;[^}]*block-size:\s*44px;/)
  expect(estilos).toMatch(/\.maquete-posto:focus-visible\s*\{[^}]*outline:[^}]*var\(--maquete-foco\)/)
})

it('mantém o SVG abaixo de 31 kB com os 19 rótulos e balões ligados', () => {
  const valores = Object.fromEntries(EQUIPE.map(f => [f.id, dados.aplicacoes.total]))
  for (const salaDestacada of [undefined, ...salas.map(sala => sala.id)]) {
    const html = render({ mostrarPlaquinhas: true, valores, salaDestacada })
    expect(html.match(/class="maquete-balao"/g)).toHaveLength(19)
    expect(new TextEncoder().encode(html).byteLength).toBeLessThan(31_000)
  }
})

it('habilita as animações apenas quando o navegador permite movimento', () => {
  const [estatico, animado] = estilos.split('@media (prefers-reduced-motion: no-preference)')
  expect(estatico).not.toMatch(/animation\s*:/)
  expect(animado).toMatch(/animation:\s*maquete-digitar/)
  expect(animado).toMatch(/animation:\s*maquete-chamar/)
})
