import { esconderValores } from '../lib/olho'
import { rascunhos } from '../app/rascunhos'
import { Ajustes } from '../telas/ajustes/Ajustes'
import { Cartoes } from '../telas/cartoes/Cartoes'
import { Lancar } from '../telas/lancar/Lancar'
import { act, createElement, Fragment, useState, type ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { ContextoApp, type Ctx } from '../app/contexto'
import { apiExemplo } from '../api/exemplo'
import { Cadastro, FichaFuncionario } from '../telas/escritorio/Ficha'
import { Guardado } from '../telas/guardado/Guardado'
import { Imoveis } from './Imoveis'
import { AgenteDaAba, AGENTE_POR_ABA } from '../telas/escritorio/AgenteDaAba'
import { DocumentoTeste, NoTeste } from '../telas/escritorio/numeros.dom-teste'
import { useEscritorio } from '../app/useDados2'
import { PerguntaCard } from './Pergunta'
import { hojeRecife, reais } from '../lib/formato'
import type { Api, ImovelTela } from '../api/tipos'
import type { Rota } from '../lib/rotas'

afterEach(() => {
  vi.unstubAllGlobals()
  esconderValores(false)
})
async function montar(elemento: ReactElement, mudancas: Partial<Api> = {}, equipe = false, extra: Partial<Ctx> = {}) {
  const doc = new DocumentoTeste()
  Object.assign(NoTeste.prototype, {
    focus() {},
    closest() {
      return null
    },
    querySelectorAll() {
      return []
    },
  })
  Object.assign(doc.documentElement, { dataset: {} })
  vi.stubGlobal('document', doc)
  vi.stubGlobal(
    'window',
    Object.assign(new EventTarget(), { document: doc, HTMLElement: NoTeste, HTMLIFrameElement: class {} }),
  )
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window))
  vi.stubGlobal('removeEventListener', window.removeEventListener.bind(window))
  vi.stubGlobal('localStorage', {
    getItem() {
      return null
    },
    setItem() {},
  })
  vi.stubGlobal('location', { hash: '#/casa?sem3d', search: '?sem3d' })
  vi.stubGlobal('history', {
    state: null,
    replaceState(_s: unknown, _t: string, url: string) {
      location.hash = url.slice(url.indexOf('#'))
    },
  })
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const sessao = (await apiExemplo.sessao())!
  const familia = { ...sessao.familias[0], papel: equipe ? ('equipe' as const) : ('casal' as const) }
  const api = { ...apiExemplo, ...mudancas }
  const ctx = {
    api,
    sessao,
    familia,
    versao: 0,
    oculto: false,
    toast() {},
    recarregar: async () => {},
    tentar: async (f: () => Promise<unknown>) => {
      await f()
      return true
    },
    ...extra,
  } as unknown as Ctx
  const container = doc.createElement('div')
  doc.body.appendChild(container)
  const root = createRoot(container as unknown as HTMLElement)
  await act(async () => root.render(createElement(ContextoApp.Provider, { value: ctx }, elemento)))
  await act(async () => {
    await new Promise(r => setTimeout(r, 400))
  })
  const botao = (texto: string) =>
    container.buscar(
      n => n.tagName === 'BUTTON' && (n.textContent === texto || n.getAttribute('aria-label') === texto),
    )[0]
  const clicar = async (texto: string) => {
    expect(botao(texto), texto).toBeDefined()
    await act(async () => botao(texto).click())
  }
  const abrirTarefas = async () => {
    const botoes = container.buscar(
      n =>
        n.tagName === 'BUTTON' &&
        n.getAttribute('aria-controls') !== null &&
        (n.getAttribute('class') || '').includes('agente-aba-divulgacao'),
    )
    expect(botoes, 'Uma divulgacao por agente').toHaveLength(1)
    const botao = botoes[0]
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    await act(async () => botao.click())
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    const painel = container.buscar(n => n.getAttribute('id') === botao.getAttribute('aria-controls'))[0]
    expect(painel).toBeDefined()
    expect(painel.getAttribute('hidden')).toBeNull()
  }
  const preencher = async (rotulo: string, valor: string) => {
    const input = container.buscar(
      n =>
        n.tagName === 'INPUT' &&
        !!(
          n.getAttribute('aria-label') === rotulo ||
          n.parentNode?.textContent.startsWith(rotulo) ||
          n.parentNode?.parentNode?.textContent.startsWith(rotulo)
        ),
    )[0]
    expect(input, rotulo).toBeDefined()
    const props = Object.entries(input).find(([k]) => k.startsWith('__reactProps'))![1] as any
    await act(async () => props.onChange({ target: { value: valor } }))
  }
  const navegar = async (texto: string) => {
    const link = container.buscar(n => n.tagName === 'A' && n.textContent === texto)[0]
    expect(link, texto).toBeDefined()
    await act(async () => link.click())
  }
  return {
    api,
    ctx,
    familia,
    container,
    clicar,
    abrirTarefas,
    preencher,
    navegar,
    atualizar: async () => {
      await act(async () => root.render(createElement(ContextoApp.Provider, { value: { ...ctx } }, elemento)))
    },
    fechar: async () => {
      await act(async () => root.unmount())
    },
  }
}

it('equipe só monta agente em Casa e a feira não pede nem envia dinheiro', async () => {
  expect(Object.keys(AGENTE_POR_ABA)).toHaveLength(12)
  for (const rota of Object.keys(AGENTE_POR_ABA)) {
    const feiraRegistrar = vi.fn(async () => {})
    const a = await montar(createElement(AgenteDaAba, { rota: rota as Rota }), { feiraRegistrar }, true)
    try {
      expect(a.container.buscar(n => !!n.getAttribute('data-agente')).length).toBe(rota === 'casa' ? 1 : 0)
      if (rota !== 'casa') continue
      await a.abrirTarefas()
      await a.clicar('Nova feira')
      expect(a.container.textContent).not.toContain('Quanto deu')
      expect(a.container.textContent).not.toContain('R$')
      await a.clicar('Salvar')
      expect(feiraRegistrar).toHaveBeenCalledWith(a.familia.id, { data: hojeRecife(), loja: '' })
    } finally {
      await a.fechar()
    }
  }
}, 20000)

it('Cartões informa valor do banco em reais e data de pagamento', async () => {
  const faturaInformar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'cartoes' }), {
    faturaInformar,
    cartoes: async () => [],
    faturasBanco: async () => [],
    faturas: async () => [
      { cartao_id: 'cartao', cartao: 'Banco', mes: '2026-11', vencimento: '2026-11-20', total: 10, fechada: true },
    ],
  })
  try {
    await a.abrirTarefas()
    await a.clicar('Editar')
    await a.preencher('Valor que veio no banco', '123,45')
    await a.preencher('Paga em (deixe vazio se ainda não pagou)', '2026-11-15')
    await a.clicar('Salvar')
    expect(faturaInformar).toHaveBeenCalledWith(a.familia.id, 'cartao', '2026-11', {
      valor_banco: 123.45,
      paga_em: '2026-11-15',
    })
  } finally {
    await a.fechar()
  }
})

it.each(['feito', 'adiar_para'])(
  'pergunta pendente da Secretária responde %s pelo contrato original, mesmo fora das primeiras três',
  async opcao => {
    const escritorioResponder = vi.fn(async () => {})
    const a = await montar(createElement(AgenteDaAba, { rota: 'escritorio' }), {
      escritorioResponder,
      escritorioHoje: async () => ({
        funcionarios: [],
        entregue: [],
        trabalhando: [],
        precisa_de_voce: [
          ...[1, 2, 3].map(n => ({
            id: String(n),
            funcionario: 'contador',
            pergunta: 'Outra pergunta',
            contexto: '',
            opcoes: [],
          })),
          {
            id: 'lembrete:l',
            funcionario: 'secretaria',
            pergunta: 'Lembrar de ligar',
            contexto: '',
            opcoes: [
              { id: opcao, rotulo: 'Responder lembrete', ...(opcao === 'adiar_para' ? { pede: 'data' as const } : {}) },
            ],
          },
        ],
      }),
    })
    try {
      await a.clicar('Responder lembrete')
      if (opcao === 'adiar_para') {
        await a.preencher('Em que dia?', '2026-11-25')
        await a.clicar('Salvar resposta')
      }
      expect(escritorioResponder).toHaveBeenCalledWith(
        a.familia.id,
        'lembrete:l',
        opcao,
        opcao === 'adiar_para' ? { data: '2026-11-25' } : undefined,
      )
    } finally {
      await a.fechar()
    }
  },
)

it('Tesoureiro confere data e valor antes de confirmar recebimento em reais', async () => {
  const recebimentoMudar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'planejamento' }), {
    recebimentoMudar,
    recebimentos: async () => [
      {
        id: 'r',
        descricao: 'Contrato',
        valor: 123.45,
        mes_previsto: '2026-11',
        tipo: 'contrato',
        certo: true,
        meu: true,
        dono_membro: 'm',
        dono_nome: null,
        recebido_em: null,
        valor_recebido: null,
        mes_novo: null,
      },
    ],
  })
  try {
    await a.abrirTarefas()
    await a.clicar('Chegou')
    expect(recebimentoMudar).not.toHaveBeenCalled()
    await a.preencher('Data em que chegou', hojeRecife())
    const form = a.container.buscar(n => n.tagName === 'FORM')[0]
    const props = Object.entries(form).find(([k]) => k.startsWith('__reactProps'))![1] as any
    await act(async () => props.onSubmit({ preventDefault() {} }))
    expect(recebimentoMudar).toHaveBeenCalledWith(a.familia.id, 'r', {
      recebido_em: hojeRecife(),
      valor_recebido: 123.45,
    })
  } finally {
    await a.fechar()
  }
})

it('Secretária cria lembrete com o horário de Recife convertido para ISO', async () => {
  const lembreteCriar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'escritorio' }), {
    lembreteCriar,
    lembretes: async () => [],
  })
  try {
    await a.abrirTarefas()
    await a.clicar('Novo lembrete')
    await a.preencher('O quê', 'Ligar')
    await a.preencher('Quando', '2026-11-20T09:00')
    await a.clicar('Salvar')
    expect(lembreteCriar).toHaveBeenCalledWith(a.familia.id, {
      titulo: 'Ligar',
      quando: '2026-11-20T12:00:00.000Z',
      repetir: 'nunca',
      para: 'eu',
    })
  } finally {
    await a.fechar()
  }
})

it('Fiscal registra feira, anexa a nota de exemplo e salva a contagem', async () => {
  const feiraRegistrar = vi.fn(async () => {}),
    feiraAnexarNota = vi.fn(async () => 'nota'),
    estoqueContar = vi.fn(async () => {})
  const a = await montar(createElement(AgenteDaAba, { rota: 'casa' }), {
    feiraRegistrar,
    feiraAnexarNota,
    estoqueContar,
    feiras: async () => [
      {
        id: 'f',
        data: hojeRecife(),
        semana: '2026-11-09',
        loja: null,
        tem_nota: false,
        sem_nota_motivo: null,
        feita_por: null,
      },
    ],
    estoque: async () => ({
      itens: [{ id: 'arroz', nome: 'Arroz', categoria: 'Despensa', ativo: true }],
      contagens: [],
    }),
  })
  try {
    await a.abrirTarefas()
    await a.clicar('Nova feira')
    await a.preencher('Quanto deu', '123,45')
    await a.clicar('Salvar')
    expect(feiraRegistrar).toHaveBeenCalledWith(a.familia.id, { data: hojeRecife(), valor: 123.45, loja: '' })
    await a.clicar('Anexar a nota')
    expect(feiraAnexarNota).toHaveBeenCalledWith(a.familia.id, 'f', 'exemplo')
    await a.clicar('Contar agora')
    await a.clicar('Pouco')
    await a.clicar('Salvar a contagem')
    expect(estoqueContar).toHaveBeenCalledWith(a.familia.id, [{ item_id: 'arroz', estado: 'pouco' }])
  } finally {
    await a.fechar()
  }
})

it('Gestor abre aplicação e aporte na mesma aba, enviando reais', async () => {
  const guardadoCriar = vi.fn(async () => {}),
    guardadoMovimentar = vi.fn(async () => {})
  const a = await montar(
    createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'guardado' }), createElement(Guardado)),
    { guardadoCriar, guardadoMovimentar },
  )
  try {
    await a.abrirTarefas()
    await a.navegar('Nova aplicação')
    await a.preencher('Onde o dinheiro está', 'Inter')
    await a.preencher('Quanto tem lá hoje', '123,45')
    await a.clicar('Guardar')
    expect(guardadoCriar).toHaveBeenCalledWith(
      a.familia.id,
      expect.objectContaining({
        banco: 'Inter',
        tipo: 'caixinha',
        valor_inicial: 123.45,
        pct_cdi: 100,
        data: hojeRecife(),
      }),
    )
    await a.navegar('Guardar dinheiro')
    await a.preencher('Quanto', '12,34')
    await a.clicar('Anotar o que guardei')
    expect(guardadoMovimentar).toHaveBeenCalledWith(
      expect.any(String),
      'aporte',
      12.34,
      hojeRecife(),
      expect.any(String),
    )
  } finally {
    await a.fechar()
  }
})

it.each([false, true])('imóvel novo/edição=%s valida valor inválido e entrega reais ao salvar', async editar => {
  const inicial: ImovelTela | null = editar
    ? {
        id: 'i',
        apelido: 'Casa',
        valor: 500,
        uso: 'parado',
        aluguel: 0,
        custos: 0,
        vacancia: '0',
        tem_contrato: false,
        contrato_ate: null,
        venda_valor: null,
        venda_mes: null,
        venda_contrato: false,
        meu: true,
        dono_membro: 'm',
        dono_nome: null,
      }
    : null
  let lista: ImovelTela[] = inicial ? [inicial] : []
  const salvar = vi.fn(async (_familia, _id, d) => {
    lista = [{ ...d, id: 'i', meu: true, dono_membro: 'm', dono_nome: null }]
  })
  const a = await montar(createElement(Imoveis, { aplicado: 100 }), {
    imoveis: async () => lista,
    imovelSalvar: salvar,
  })
  try {
    expect(a.container.textContent).toContain('Cadastrar imóvel')
    if (editar)
      await act(async () =>
        a.container
          .buscar(n => n.tagName === 'BUTTON' && !!n.getAttribute('aria-label')?.startsWith('Casa,'))[0]
          .click(),
      )
    else await a.clicar('Cadastrar imóvel')
    await a.preencher('Apelido', 'Casa nova')
    await a.preencher('Quanto vale hoje', 'inválido')
    await a.clicar('Salvar')
    expect(salvar).not.toHaveBeenCalled()
    await a.preencher('Quanto vale hoje', '123.456,78')
    await a.clicar('Salvar')
    expect(salvar).toHaveBeenCalledWith(
      a.familia.id,
      editar ? 'i' : null,
      expect.objectContaining({ apelido: 'Casa nova', valor: 123456.78, aluguel: 0, custos: 0 }),
    )
    expect(a.container.textContent.replace(/\s/g, '')).toContain(reais(123556.78).replace(/\s/g, ''))
  } finally {
    await a.fechar()
  }
})

it.each(['Nova aplica\u00e7\u00e3o', 'Guardar dinheiro', 'Tirar dinheiro'])(
  'reabre o mesmo atalho %s depois de fechar, sem hashchange artificial',
  async atalho => {
    const a = await montar(
      createElement(Fragment, null, createElement(Cadastro, { id: 'guardado' }), createElement(Guardado)),
    )
    try {
      await a.navegar(atalho)
      expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(1)
      await a.clicar('Fechar')
      expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(0)
      await a.navegar(atalho)
      expect(a.container.buscar(n => n.getAttribute('role') === 'dialog')).toHaveLength(1)
    } finally {
      await a.fechar()
    }
  },
)

it.each([false, true])(
  'duas instancias reais compartilham leitura e trava do lembrete recorrente; falha na releitura=%s',
  async falha => {
    const confirmacoes: (() => void)[] = []
    let enviada = false
    let ocorrencia = 1
    const pergunta = {
      id: 'lembrete:recorrente',
      funcionario: 'secretaria',
      pergunta: 'Lembrete diario',
      contexto: '',
      opcoes: [{ id: 'feito', rotulo: 'Feito recorrente' }],
    }
    const escritorioResponder = vi.fn(async () => {
      await new Promise<void>(r => {
        confirmacoes.push(r)
      })
      enviada = true
      ocorrencia++
    })
    const escritorioHoje = vi.fn(async () => {
      if (enviada && falha) throw new Error('Sem rede na releitura')
      return { funcionarios: [], entregue: [], trabalhando: [], precisa_de_voce: enviada ? [] : [pergunta] }
    })
    const respostas: ReturnType<typeof useEscritorio>['responder'][] = []
    function Instancia({ indice }: { indice: number }) {
      const dados = useEscritorio()
      respostas[indice] = dados.responder
      const p = dados.perguntas[0]
      return p ? createElement(PerguntaCard, { p, quem: 'Secretaria', responder: dados.responder }) : null
    }
    const a = await montar(
      createElement(Fragment, null, createElement(Instancia, { indice: 0 }), createElement(Instancia, { indice: 1 })),
      { escritorioResponder, escritorioHoje },
    )
    try {
      const botao = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito recorrente')[0]
      let concorrente!: Promise<unknown>
      await act(async () => {
        botao.click()
        botao.click()
        concorrente = respostas[1](pergunta.id, 'feito')
      })
      expect(escritorioResponder).toHaveBeenCalledTimes(1)
      await act(async () => {
        confirmacoes.forEach(confirmar => confirmar())
        await concorrente
      })
      if (falha) {
        expect(a.container.textContent).toContain('Respondida, atualizando')
        expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito recorrente')).toHaveLength(0)
        await act(async () => {
          await respostas[0](pergunta.id, 'feito')
        })
        await a.clicar('Recarregar')
        expect(a.container.textContent).toContain('Respondida, atualizando')
      } else {
        expect(a.container.textContent).not.toContain('Lembrete diario')
        await act(async () => {
          await respostas[0](pergunta.id, 'feito')
        })
      }
      expect(ocorrencia).toBe(2)
      expect(escritorioHoje).toHaveBeenCalledTimes(falha ? 3 : 2)
      expect(escritorioResponder).toHaveBeenCalledTimes(1)
    } finally {
      await act(async () => {
        confirmacoes.forEach(confirmar => confirmar())
      })
      await a.fechar()
    }
  },
)

it('agente da aba e ficha real nao duplicam a pergunta acionavel da Secretaria', async () => {
  const p = {
    id: 'lembrete:ficha',
    funcionario: 'secretaria',
    pergunta: 'Ligar hoje',
    contexto: '',
    opcoes: [{ id: 'feito', rotulo: 'Feito na ficha' }],
  }
  const f = {
    id: 'secretaria',
    nome: 'Secretaria',
    estado: 'precisa_de_voce',
    frase: 'Ligar',
    ultimas_respostas: [],
  } as any
  const e = { funcionarios: [f], entregue: [], trabalhando: [], precisa_de_voce: [p] }
  function Ficha() {
    const dados = useEscritorio()
    return dados.e ? createElement(FichaFuncionario, { f, e: dados.e, responder: dados.responder, fechar() {} }) : null
  }
  const a = await montar(
    createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'escritorio' }), createElement(Ficha)),
    { escritorioHoje: async () => e },
  )
  try {
    expect(a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Feito na ficha')).toHaveLength(1)
  } finally {
    await a.fechar()
  }
})

async function secretariaComFicha(falha = false) {
  const p = {
    id: 'lembrete:prioridade',
    funcionario: 'secretaria',
    pergunta: 'Ligar pela ficha aberta',
    contexto: '',
    opcoes: [
      { id: 'feito', rotulo: 'Concluir pela ficha' },
      { id: 'adiar_para', rotulo: 'Adiar pela ficha', pede: 'data' as const },
    ],
  }
  const f = {
    id: 'secretaria',
    nome: 'Secretaria',
    estado: 'precisa_de_voce',
    frase: 'Ligar',
    ultimas_respostas: [],
  } as any
  const e = { funcionarios: [f], entregue: [], trabalhando: [], precisa_de_voce: [p] }
  let enviada = false
  let confirmar = () => {}
  const escritorioResponder = vi.fn(async () => {
    await new Promise<void>(resolve => {
      confirmar = resolve
    })
    enviada = true
  })
  const escritorioHoje = vi.fn(async () => {
    if (enviada && falha) throw new Error('Releitura indisponivel')
    return enviada ? { ...e, precisa_de_voce: [] } : e
  })
  function Ficha() {
    const dados = useEscritorio()
    const [aberta, setAberta] = useState(false)
    return createElement(
      Fragment,
      null,
      createElement('button', { onClick: () => setAberta(true) }, 'Abrir ficha de teste'),
      aberta && dados.e
        ? createElement(FichaFuncionario, { f, e: dados.e, responder: dados.responder, fechar: () => setAberta(false) })
        : null,
    )
  }
  const a = await montar(
    createElement(Fragment, null, createElement(AgenteDaAba, { rota: 'escritorio' }), createElement(Ficha)),
    { escritorioHoje, escritorioResponder },
  )
  await a.clicar('Abrir ficha de teste')
  const dialogo = () => a.container.buscar(n => n.getAttribute('role') === 'dialog')[0]
  const perguntaNoDialogo = () => {
    const perguntas = a.container.buscar(n => n.getAttribute('data-pergunta') === p.id)
    expect(perguntas).toHaveLength(1)
    expect(dialogo().buscar(n => n === perguntas[0])).toHaveLength(1)
    return perguntas[0]
  }
  return {
    ...a,
    dialogo,
    perguntaNoDialogo,
    escritorioResponder,
    escritorioHoje,
    confirmar: async () => {
      await act(async () => confirmar())
    },
  }
}

it('ficha aberta tem a pergunta e todos os botoes dentro do dialogo, sem resposta fora', async () => {
  const a = await secretariaComFicha()
  try {
    a.perguntaNoDialogo()
    await a.clicar('Adiar pela ficha')
    const pergunta = a.perguntaNoDialogo()
    const botoes = pergunta.buscar(n => n.tagName === 'BUTTON')
    expect(botoes.map(n => n.textContent)).toEqual(['Concluir pela ficha', 'Adiar pela ficha', 'Salvar resposta'])
    for (const botao of botoes) expect(a.dialogo().buscar(n => n === botao)).toHaveLength(1)
    expect(
      a.container
        .buscar(n => n.getAttribute('data-agente') !== null)
        .flatMap(n => n.buscar(b => b.tagName === 'BUTTON' && botoes.some(x => x.textContent === b.textContent))),
    ).toHaveLength(0)
  } finally {
    await a.fechar()
  }
})

it('duplo clique dentro da ficha envia exatamente uma resposta compartilhada', async () => {
  const a = await secretariaComFicha()
  try {
    const botao = a.dialogo().buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Concluir pela ficha')[0]
    expect(botao).toBeDefined()
    await act(async () => {
      botao.click()
      botao.click()
    })
    expect(a.escritorioResponder).toHaveBeenCalledTimes(1)
    await a.confirmar()
    expect(a.escritorioResponder).toHaveBeenCalledTimes(1)
  } finally {
    await a.confirmar()
    await a.fechar()
  }
})

it('fechar ficha devolve ao agente a propriedade exclusiva da pergunta', async () => {
  const a = await secretariaComFicha()
  try {
    a.perguntaNoDialogo()
    await a.clicar('Fechar')
    expect(a.dialogo()).toBeUndefined()
    const agentes = a.container.buscar(n => n.getAttribute('data-agente') !== null)
    expect(
      agentes.flatMap(n => n.buscar(b => b.tagName === 'BUTTON' && b.textContent === 'Concluir pela ficha')),
    ).toHaveLength(1)
    expect(a.container.buscar(n => n.getAttribute('data-pergunta') === 'lembrete:prioridade')).toHaveLength(1)
  } finally {
    await a.fechar()
  }
})

it('falha na releitura da ficha conserva a trava inclusive ao devolver ao agente', async () => {
  const a = await secretariaComFicha(true)
  try {
    const botao = a.dialogo().buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Concluir pela ficha')[0]
    expect(botao).toBeDefined()
    await act(async () => {
      botao.click()
      botao.click()
    })
    await a.confirmar()
    expect(a.perguntaNoDialogo().textContent).toContain('Respondida, atualizando')
    await a.clicar('Recarregar')
    expect(a.perguntaNoDialogo().textContent).toContain('Respondida, atualizando')
    await a.clicar('Fechar')
    expect(a.container.textContent).toContain('Respondida, atualizando')
    expect(
      a.container.buscar(n => n.tagName === 'BUTTON' && /Concluir pela ficha|Adiar pela ficha/.test(n.textContent)),
    ).toHaveLength(0)
    await a.clicar('Recarregar')
    expect(a.escritorioResponder).toHaveBeenCalledTimes(1)
    expect(a.container.textContent).toContain('Respondida, atualizando')
    expect(
      a.container.buscar(n => n.tagName === 'BUTTON' && /Concluir pela ficha|Adiar pela ficha/.test(n.textContent)),
    ).toHaveLength(0)
  } finally {
    await a.confirmar()
    await a.fechar()
  }
})

it.each(['imoveis', 'cartoes'] as const)(
  'UX: leitura rejeitada em %s não parece vazio e pode tentar novamente',
  async tipo => {
    const buscar = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([])
    const a = await montar(createElement(tipo === 'imoveis' ? Imoveis : Cartoes, { aplicado: 0 }), {
      [tipo]: buscar,
      ...(tipo === 'cartoes' ? { faturas: vi.fn().mockResolvedValue([]) } : {}),
    })
    try {
      expect(a.container.textContent).toContain('Tentar novamente')
      expect(a.container.textContent).not.toContain(
        tipo === 'imoveis' ? 'Nenhum imóvel anotado' : 'Nenhum cartão cadastrado',
      )
      await a.clicar('Tentar novamente')
      expect(buscar).toHaveBeenCalledTimes(2)
      expect(a.container.textContent).toContain(
        tipo === 'imoveis' ? 'Nenhum imóvel anotado' : 'Nenhum cartão cadastrado',
      )
      buscar.mockRejectedValueOnce(new Error('offline de novo'))
      a.ctx.versao++
      await a.atualizar()
      expect(a.container.textContent).toContain('Dados desatualizados.')
      expect(a.container.textContent).toContain('Tentar novamente')
    } finally {
      await a.fechar()
    }
  },
)
// 24/11/2026: o teste "Não gastei não conquista primeiro gasto" saiu junto com o bloco de Conquistas,
// retirado da aba Meu orçamento a pedido do dono.
it('UX: rascunho recupera valor protegido, oferece olho na folha e descarta', async () => {
  const sessao = (await apiExemplo.sessao())!,
    familia = sessao.familias[0]
  const chave = 'anotar:' + JSON.stringify([apiExemplo.modo, sessao.userId, familia.id])
  rascunhos.clear()
  const storage = rascunhos
  storage.set(chave, {
    txt: '753,21',
    desc: 'Teste privado',
    quando: hojeRecife(),
    cartao: null,
    envelope: familia.envelopeId,
    parcelas: 1,
  })
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  })
  esconderValores(true)
  const a = await montar(createElement(Lancar), {}, false, {
    resumo: await apiExemplo.resumoHoje(familia.id),
    lancarAberto: {},
    oculto: true,
  })
  try {
    expect(a.container.textContent).toContain('Rascunho recuperado')
    expect(a.container.textContent).not.toContain('753')
    expect(
      a.container.buscar(n => n.tagName === 'BUTTON' && n.getAttribute('aria-label') === 'Mostrar valores'),
    ).toHaveLength(1)
    await a.clicar('Descartar')
    expect(storage.has(chave)).toBe(false)
  } finally {
    await a.fechar()
  }
})

it('UX: compra da equipe recupera só texto e limpa após salvar', async () => {
  const sessao = (await apiExemplo.sessao())!,
    familia = sessao.familias[0]
  const chave = 'compra-equipe:' + JSON.stringify([apiExemplo.modo, sessao.userId, familia.id])
  rascunhos.clear()
  const storage = rascunhos
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  })
  const api = { anotarCompraEquipe: vi.fn().mockResolvedValue({ aviso: 'Compra anotada.' }) }
  const a = await montar(createElement(Lancar), api, true, { lancarAberto: {}, fecharLancar: vi.fn() })
  try {
    await a.preencher('O que você comprou?', 'Compra de teste')
    expect(storage.get(chave)).toBe('Compra de teste')
    await a.clicar('Usar uma nota de exemplo')
    expect(storage.get(chave)).toBe('Compra de teste')
  } finally {
    await a.fechar()
  }
  const b = await montar(createElement(Lancar), api, true, { lancarAberto: {}, fecharLancar: vi.fn() })
  try {
    expect(b.container.textContent).toContain('Rascunho recuperado')
    expect(b.container.textContent).not.toContain('Foto da nota pronta')
    await b.clicar('Anotar a compra')
    expect(api.anotarCompraEquipe).toHaveBeenCalledWith(familia.id, {
      tipo: 'feira',
      nome: 'Compra de teste',
      foto: null,
    })
    expect(storage.has(chave)).toBe(false)
  } finally {
    await b.fechar()
  }
})

it('UX: olho fechado retira link privado de convite e bloqueia compartilhamento', async () => {
  esconderValores(true)
  const reenviar = vi.fn(),
    toast = vi.fn()
  const a = await montar(
    createElement(Ajustes),
    {
      convites: vi.fn().mockResolvedValue([
        {
          id: 'convite-ux',
          nome: 'Convidado de teste',
          email: 'ux-sentinela@example.invalid',
          papel: 'pessoa',
          situacao: 'esperando',
        },
      ]),
      reenviarConvite: reenviar,
    },
    false,
    { oculto: true, toast },
  )
  try {
    const link = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Reenviar')[0]
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBeNull()
    await act(async () => link.click())
    expect(reenviar).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith('Abra o olho para compartilhar este convite.')
  } finally {
    await a.fechar()
  }
})
it('f32: conversa tem painel próprio e recolher preserva o controle acessível', async () => {
  const a = await montar(createElement(AgenteDaAba, { rota: 'casa' }))
  try {
    const botao = a.container.buscar(n => n.tagName === 'BUTTON' && n.textContent === 'Recolher')[0]
    const id = botao.getAttribute('aria-controls')
    expect(id).toBeTruthy()
    const painel = a.container.buscar(n => n.getAttribute('id') === id)[0]
    expect(painel).toBeDefined()
    expect(botao.buscar(n => n.tagName.toLowerCase() === 'svg')).toHaveLength(1)
    await act(async () => botao.click())
    expect(painel.getAttribute('hidden')).not.toBeNull()
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    await act(async () => botao.click())
    expect(painel.getAttribute('hidden')).toBeNull()
  } finally {
    await a.fechar()
  }
})
it('15: recolher e expandir informam estado acessível', async () => {
  const a = await montar(createElement(AgenteDaAba, { rota: 'casa' }))
  try {
    const botao = () =>
      a.container.buscar(n => n.tagName === 'BUTTON' && /^(Recolher|Expandir|Responder)$/.test(n.textContent))[0]
    expect(botao().getAttribute('aria-expanded')).toBe('true')
    await act(async () => botao().click())
    expect(botao().getAttribute('aria-expanded')).toBe('false')
  } finally {
    await a.fechar()
  }
})
it('3: agente com falha não anuncia sem pendências e pode repetir', async () => {
  const ler = vi.fn(async () => {
    throw Error('falha')
  })
  const a = await montar(createElement(AgenteDaAba, { rota: 'casa' }), { escritorioHoje: ler })
  try {
    expect(a.container.textContent).toContain('Não foi possível conferir')
    expect(a.container.textContent).not.toContain('Sem pendências')
    const antes = ler.mock.calls.length
    await a.clicar('Tentar de novo')
    expect(ler.mock.calls.length).toBeGreaterThan(antes)
  } finally {
    await a.fechar()
  }
})
