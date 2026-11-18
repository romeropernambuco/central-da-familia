import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ts from 'typescript'
import { beforeAll, expect, it, vi } from 'vitest'
import { PrivacidadePropostas } from '../comuns/privacidade'
import { carregarDadosInicio, type DadosInicio, type NivelAlerta } from '../dadosExemplo'
import type { PropsProposta } from '../Propostas'
import { Proposta } from './Proposta'
import { chromium, noNavegador } from './verificarNavegador'

const cenarios = (['claro', 'escuro'] as const).flatMap(tema =>
  (['celular', 'desktop'] as const).map(dispositivo => ({ tema, dispositivo })))
let dados: DadosInicio

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T14:00:00Z'))
  try { dados = await carregarDadosInicio() } finally { vi.useRealTimers() }
})

function render(cenario: Omit<PropsProposta, 'dados'> = cenarios[0], snapshot = dados, oculto = false) {
  return renderToStaticMarkup(createElement(PrivacidadePropostas.Provider, { value: oculto },
    createElement(Proposta, { ...cenario, dados: snapshot })))
}

function comDecisoes() {
  const copia = structuredClone(dados)
  const decisoes = [
    { id: 'lembrete:aviso', texto: 'Guardar comprovante', nivel: 'lembrete' },
    { id: 'estoque:lista', texto: 'Revisar estoque', nivel: 'operacao' },
    { id: 'fatura:9817,28', texto: 'Conferir cobrança de R$ 9.817,28, 77,3% e razão 17/19', nivel: 'dinheiro em risco' },
    { id: 'retorno:1', texto: 'Checar retorno do banco', nivel: 'operacao' },
  ] satisfies { id: string; texto: string; nivel: NivelAlerta }[]
  copia.pendencias.fila = { ...copia.pendencias.fila, estado: 'pronto', valor: decisoes.map(({ id, texto }, i) => ({
    id, perguntaCurta: texto, funcionario: i === 1 ? 'fiscal' : 'Contador',
    valor: { unidade: 'reais', natureza: 'previsto', estado: 'pronto', valor: i === 2 ? 9817.28 : 241.11 + i },
  })) }
  copia.alertas = { ...copia.alertas, estado: 'pronto', valor: decisoes }
  copia.plano2029.progressao = { ...copia.plano2029.progressao, estado: 'pronto', valor: 61.7 }
  copia.plano2029.faltamPorMesComMargem = { ...copia.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: -981728 }
  return copia
}

it.each(cenarios)('organiza as seções em $tema para $dispositivo', cenario => {
  const html = render(cenario)
  expect(html).toContain(`data-tema="${cenario.tema}" data-dispositivo="${cenario.dispositivo}"`)
  expect(html.match(/<h1[ >]/g)).toHaveLength(1)
  expect(html.match(/>Exemplo</g)).toHaveLength(1)
  expect(html.match(/class="l-referencia"/g)).toHaveLength(4)
  expect(html).toMatch(/Estado do dia[\s\S]*l-palco[\s\S]*l-fila[\s\S]*l-rumo[\s\S]*l-bento[\s\S]*Navegação principal/)
  expect(html).toContain(`block-size:${cenario.dispositivo === 'celular' ? 528 : 640}px`)
  expect(html.match(/class="l-estado"/g)).toHaveLength(dados.funcionarios.valor?.length ?? 0)
  expect(html.match(/<svg[^>]*class="cf-ilustracao"[^>]*aria-hidden="true"/g)).toHaveLength(5)
  expect(html).toMatch(/2026<.*2027<.*2028<.*2029</)
  expect(html).toContain('Viver de rendimentos')
})

it('mostra a fila completa em ordem de urgência e reserva cada cifra uma vez', () => {
  const html = render(cenarios[0], comDecisoes())
  expect(html.match(/class="l-decisao"/g)).toHaveLength(4)
  expect(html).toMatch(/Conferir cobrança[\s\S]*Dinheiro em risco[\s\S]*Revisar estoque[\s\S]*Operação[\s\S]*Checar retorno[\s\S]*Guardar comprovante[\s\S]*Lembrete/)
  expect(html.match(/9\.817,28/g)).toHaveLength(1)
})

it('remove cifras, proporções, texto livre e a geometria calculada com o olho fechado', () => {
  const copia = comDecisoes()
  const aberto = render(cenarios[0], copia)
  expect(aberto).toMatch(/Sobra mensal com margem/)
  expect(aberto).toMatch(/61,7<span class="numero-simbolo">%/)
  expect(aberto).toContain('class="l-posicao"')
  for (const cenario of cenarios) {
    const fechado = render(cenario, copia, true)
    expect(fechado).toContain('class="l-caminho"')
    expect(fechado).toContain('Valor oculto')
    expect(fechado).not.toMatch(/R\$|data-numero-financeiro|l-cobertura|l-posicao|Você está aqui|Sobra mensal|Falta mensal|61,7|77,3|17\/19|9817,28|9\.817/)
    const outra = structuredClone(copia)
    outra.plano2029.progressao = { ...copia.plano2029.progressao, estado: 'pronto', valor: 130 }
    outra.plano2029.faltamPorMesComMargem = { ...copia.plano2029.faltamPorMesComMargem, estado: 'pronto', valor: 123456 }
    expect(render(cenario, outra, true)).toBe(fechado)
  }
})

it('respeita os escopos de Assessor e de orçamento pessoal com o olho aberto', () => {
  const copia = comDecisoes()
  copia.pessoa.papel = { ...copia.pessoa.papel, estado: 'pronto', valor: 'equipe' }
  const html = render(cenarios[0], copia)
  expect(html).toContain('Conferir o estoque')
  expect(html).not.toMatch(/Guardar comprovante|Conferir cobrança|R\$|data-numero-financeiro|l-trilha|l-resumo|l-motores/)
  copia.pessoa.papel = { ...copia.pessoa.papel, valor: 'pessoa' }
  const pessoal = render(cenarios[0], copia)
  expect(pessoal).toContain('Pode gastar hoje')
  expect(pessoal).not.toMatch(/l-trilha|l-palco|l-decisao|Total aplicado/)
})

it('mostra estados ausentes sem inserir zero ou marcador de progresso', () => {
  const copia = structuredClone(dados)
  copia.hojePodeGastar.valor = { ...copia.hojePodeGastar.valor, estado: 'indisponivel', valor: null }
  copia.plano2029.progressao = { ...copia.plano2029.progressao, estado: 'indisponivel', valor: null }
  copia.pendencias.fila = { ...copia.pendencias.fila, estado: 'indisponivel', valor: null }
  const html = render(cenarios[0], copia)
  expect(html).toMatch(/Pode gastar hoje<\/span><span class="l-sem-dado">Ainda sem dado/)
  expect(html).toMatch(/Cobertura atual<\/p><span class="l-sem-dado">Ainda sem dado/)
  expect(html).toContain('class="l-fila-vazia">Ainda sem dado')
  expect(html).not.toContain('class="l-posicao"')
})

it('usa somente a API do escritório 3D e mantém as restrições visuais locais', () => {
  const fonte = ['Proposta.tsx', 'Palco.tsx', 'Financeiro.tsx', 'Fila.tsx'].map(arquivo => ts.sys.readFile('src/propostas/l/' + arquivo)).join('\n')
  const css = ts.sys.readFile('src/propostas/l/proposta.css')!
  expect(fonte).toContain("from '../comuns/Escritorio3D'")
  expect(fonte).toMatch(/<Escritorio3D[\s\S]*mostrarPlaquinhas[\s\S]*onSelecionar/)
  expect(fonte).not.toMatch(/EscritorioMaquete|from .*api\//u)
  expect(fonte).not.toMatch(/\p{Extended_Pictographic}/u)
  expect(css).not.toMatch(/gradient\(|backdrop-filter:|border-(?:left|inline-start):|text-shadow:|neon/i)
  expect(css.match(/--risco\b/g)).toHaveLength(3)
  expect(css).toContain('prefers-reduced-motion: reduce')
  expect(css).toMatch(/\.l-principal\s*\{\s*font-size: 35px;/)
  expect(css).toMatch(/font-variant-numeric: tabular-nums;\s*white-space: nowrap;/)
})

it.skipIf(!chromium || typeof WebSocket === 'undefined')('mede alvos, texto e primeira dobra e exercita menu, fila e posto com teclado', async () => {
  await noNavegador([comDecisoes(), dados], async (rodar, tecla) => {
    for (const { tema, dispositivo } of cenarios) {
      for (const largura of dispositivo === 'celular' ? [375] : [1280, 1440]) {
        await rodar(`montar('${tema}', '${dispositivo}', ${largura}, false, 1); document.fonts.ready.then(() => true)`)
        const medida = await rodar<{ alvos: string[]; cortes: string[]; largura: boolean; menu: boolean; dobra: string[]; contraste: number; movimento: boolean }>(String.raw`
          (() => {
            const visiveis = seletor => todos(seletor).filter(el => el.getClientRects().length);
            const alvos = visiveis('button, summary').filter(el => {
              const caixa = el.getBoundingClientRect();
              return caixa.width < 44 || caixa.height < 44 || !(el.getAttribute('aria-label') || texto(el));
            }).map(el => texto(el) || el.getAttribute('aria-label') || el.className);
            const cortes = visiveis('[data-numero-financeiro]').filter(el => {
              const pai = el.closest('button, article, li, figcaption');
              return pai && el.getBoundingClientRect().right > pai.getBoundingClientRect().right;
            }).map(texto);
            const tokens = getComputedStyle(q('.l-inicio'));
            const luminancia = token => {
              const bytes = tokens.getPropertyValue(token).trim().slice(1).match(/../g);
              return bytes.map(byte => parseInt(byte, 16) / 255)
                .map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
                .reduce((soma, v, i) => soma + v * [.2126, .7152, .0722][i], 0);
            };
            const contraste = Math.min(...['--fundo', '--cartao', '--menu', '--l-musgo', '--l-cena']
              .flatMap(base => ['--texto', '--texto-secundario', '--destaque', '--risco'].map(cor => [base, cor]))
              .concat([['--destaque', '--sobre-destaque']]).map(par => {
                const [escuro, claro] = par.map(luminancia).sort((a, b) => a - b);
                return (claro + .05) / (escuro + .05);
              }));
            return { alvos, cortes, contraste, largura: quadro.scrollWidth === quadro.clientWidth,
              menu: q('nav').getBoundingClientRect().bottom <= quadro.getBoundingClientRect().bottom,
              movimento: todos('.l-palco *').every(el => getComputedStyle(el).animationName === 'none'),
              dobra: Previa.medirNumeros(quadro) };
          })()
        `)
        expect(medida.alvos, `${tema}/${largura}`).toEqual([])
        expect(medida.cortes, `${tema}/${largura}`).toEqual([])
        expect(medida.largura).toBe(true)
        expect(medida.menu).toBe(true)
        expect(medida.dobra).toHaveLength(4)
        expect(medida.contraste).toBeGreaterThanOrEqual(4.5)
        expect(medida.movimento).toBe(true)
      }
    }
    await rodar("montar('escuro', 'celular', 375); q('.l-salas button:last-child').focus()")
    await tecla('Tab')
    expect(await rodar("document.activeElement.matches('.l-palco button')")).toBe(true)
    await tecla('Enter')
    expect(await rodar("q('dialog')?.open && texto(document.activeElement.closest('dialog').querySelector('h2')).length > 0")).toBe(true)
    await tecla('Escape')
    expect(await rodar("!q('dialog') && document.activeElement.matches('.l-palco button')")).toBe(true)
    await tecla(' ')
    expect(await rodar("q('dialog')?.open")).toBe(true)
    await tecla('Escape')
    expect(await rodar(String.raw`
      click(botao('.l-menu button', 'Orçamento'));
      const orcamento = texto(document.activeElement) === 'Hoje você pode gastar' &&
        botao('.l-menu button', 'Orçamento').getAttribute('aria-current') === 'location';
      click(q('.l-mais summary')); click(botao('.l-mais button', 'Rumo a 2029'));
      const mais = texto(document.activeElement) === 'Rumo a 2029' && !q('.l-mais').open;
      click(botao('.l-menu button', 'Escritório')); click(botao('.l-salas button', 'Casa'));
      const escritorio = q('.l-salas button[aria-pressed="true"]').textContent === 'Casa' &&
        texto(q('.l-equipe h3')) === 'Equipe · Casa' && todos('.l-pessoas button').length < 19;
      click(botao('.l-menu button', 'Faturas'));
      const faturas = texto(document.activeElement) === 'Faturas';
      click(botao('.l-menu button', 'Início'));
      const inicio = document.activeElement === q('h1');
      click(q('.l-saude button')); click(q('.l-acao-abrir'));
      const abrir = q('.l-acao-abrir').getAttribute('aria-expanded') === 'true' && q('.l-decisao-detalhe:not([hidden])') !== null;
      click(botao('.l-acoes button', 'Depois')); click(botao('.l-pastas button', 'Depois'));
      const adiar = todos('.l-decisao').length === 1 && texto(q('.l-decisao h3')).includes('Conferir cobrança');
      click(botao('.l-acoes button', 'Já fiz')); click(botao('.l-pastas button', 'Feitas'));
      const concluir = todos('.l-decisao').length === 1 && !!botao('.l-acoes button', 'Retomar');
      click(botao('.l-desfazer button', 'Desfazer'));
      const desfazer = botao('.l-pastas button', 'Depois').getAttribute('aria-pressed') === 'true' && todos('.l-decisao').length === 1;
      montar('escuro', 'celular', 375, true);
      ({ orcamento, mais, escritorio, faturas, inicio, abrir, adiar, concluir, desfazer,
        privacidade: !q('[data-numero-financeiro], .l-posicao') && !texto(quadro).includes('17/19') })
    `)).toEqual({ orcamento: true, mais: true, escritorio: true, faturas: true, inicio: true,
      abrir: true, adiar: true, concluir: true, desfazer: true, privacidade: true })
  })
}, 30000)
