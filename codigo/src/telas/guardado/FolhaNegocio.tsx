import { useMemo, useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { GuardadoAplicacao } from '../../api/tipos'
import { useAcoes, useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { Botao, CampoValor, Din, Sheet } from '../../componentes/base'
import { OlhoDaAba } from '../../componentes/ControlesDaAba'
import { Icone } from '../../componentes/Icone'
import { CampoPrivado } from '../../componentes/privacidade'
import { aplicacaoMinha } from '../../lib/dono'
import { dataCurta, hojeRecife, reais, textoParaValor, valorDigitadoValido } from '../../lib/formato'
import { PONTOS, textoPrivado } from '../../lib/olho'
import { novoUuid, umaPorVez } from '../../lib/seguro'
import {
  NOME_DO_TIPO,
  contaDoNegocio,
  fraseDoPrazo,
  type ContaNegocio,
  type MovimentoNegocio,
  type Negocio,
} from '../../lib/dinheiroNaRua'

type Salvar = (n: Negocio) => Promise<boolean>
const numero = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** O negócio por dentro: quanto falta voltar, o prazo, os movimentos e a comparação com o banco. */
export function FolhaNegocio({
  n,
  taxaAno,
  aplicacoes,
  salvar,
  fechar,
  mudar,
}: {
  n: Negocio
  taxaAno: number
  aplicacoes: GuardadoAplicacao[]
  salvar: Salvar
  fechar: () => void
  mudar: () => void
}) {
  const { toast } = useAcoes()
  const oculto = useOculto()
  const hoje = hojeRecife()
  const c = contaDoNegocio(n, hoje, taxaAno)
  const encerrar = async () => {
    if (await salvar({ ...n, encerrado_em: hoje }))
      toast(
        c.resultado >= 0
          ? `${n.nome} encerrado com lucro de ${reais(c.resultado)}.`
          : `${n.nome} encerrado. Voltaram ${reais(c.voltado)} dos ${reais(c.posto)} que você pôs.`,
        async () => {
          await salvar(n)
        },
      )
  }
  return (
    <Sheet
      titulo={textoPrivado(n.nome, oculto)}
      subtitulo={textoPrivado(
        [NOME_DO_TIPO[n.tipo], n.com_quem ? `com ${n.com_quem}` : ''].filter(Boolean).join(' · '),
        oculto,
      )}
      rotulo="Negócio"
      fechar={fechar}
      cabecalho={<OlhoDaAba curto />}
    >
      <NumerosDoNegocio n={n} c={c} taxaAno={taxaAno} />
      {n.combinado && (
        <p className="sub">
          <b>Combinado:</b> {textoPrivado(n.combinado, oculto)}
        </p>
      )}
      <MovimentosDoNegocio n={n} salvar={salvar} />
      {!n.encerrado_em && <NovoMovimento n={n} aplicacoes={aplicacoes} salvar={salvar} />}
      <div className="row-btns">
        {n.encerrado_em ? (
          <Botao variante="secundario" type="button" onClick={() => salvar({ ...n, encerrado_em: null })}>
            Reabrir negócio
          </Botao>
        ) : (
          <Botao variante="secundario" type="button" onClick={encerrar}>
            <Icone nome="salvo" />
            Encerrar: já voltou tudo o que ia voltar
          </Botao>
        )}
        <Botao variante="fantasma" type="button" onClick={mudar}>
          <Icone desenho={Pencil} />
          Mudar dados ou prazo
        </Botao>
      </div>
    </Sheet>
  )
}

function NumerosDoNegocio({ n, c, taxaAno }: { n: Negocio; c: ContaNegocio; taxaAno: number }) {
  const oculto = useOculto()
  const fechado = !!n.encerrado_em
  const apoio = [
    fechado ? `encerrado em ${dataCurta(n.encerrado_em!)}` : `prazo ${dataCurta(n.prazo)} (${fraseDoPrazo(c)})`,
    c.dias === 1 ? 'há 1 dia na rua' : `${fechado ? 'ficou' : 'há'} ${c.dias} dias na rua`,
    n.minha_parte < 100 ? `sua parte no lucro: ${numero(n.minha_parte).replace(',0', '')}%` : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const numeros: [string, number][] = [
    ['Você pôs', c.posto],
    ['Já voltou', c.voltado],
    ...(n.volta_prevista != null && !fechado
      ? [
          ['Espera de volta', n.volta_prevista] as [string, number],
          ['Lucro esperado', c.lucro_previsto ?? 0] as [string, number],
        ]
      : []),
    ['No banco teria rendido', c.no_banco],
  ]
  return (
    <section className="rua-numeros" aria-labelledby="ruaNumero">
      <h3 id="ruaNumero" className="lbl">
        {fechado ? (c.resultado >= 0 ? 'Lucro do negócio' : 'Faltou voltar') : 'Falta voltar'}
      </h3>
      <div className="numrow">
        <Din v={fechado ? Math.abs(c.resultado) : c.na_rua} tam="hero" />
      </div>
      <p className={'apoio' + (c.situacao === 'atrasado' ? ' passa' : '')}>{textoPrivado(apoio, oculto)}</p>
      <dl className="guard-3">
        {numeros.map(([rotulo, v]) => (
          <div key={rotulo}>
            <dt>{rotulo}</dt>
            <dd>
              <Din v={v} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="sub">
        {c.pct != null && !oculto
          ? `${fechado ? 'Rendeu' : 'Se voltar o que você espera, rende'} ${numero(c.pct)}% sobre o que você pôs. `
          : ''}
        A comparação com o banco usa a taxa dos bancos de hoje ({oculto ? PONTOS : `${numero(taxaAno)}% ao ano`}), antes
        do imposto, nas mesmas datas.
      </p>
    </section>
  )
}

function MovimentosDoNegocio({ n, salvar }: { n: Negocio; salvar: Salvar }) {
  const { toast } = useAcoes()
  const oculto = useOculto()
  const movs = [...n.movimentos].sort((a, b) => b.data.localeCompare(a.data))
  const tirar = async (m: MovimentoNegocio) => {
    if (await salvar({ ...n, movimentos: n.movimentos.filter(x => x.id !== m.id) }))
      toast('Movimento apagado.', async () => {
        await salvar(n)
      })
  }
  return (
    <section aria-labelledby="ruaMovs">
      <h3 id="ruaMovs" className="lbl">
        Movimentos
      </h3>
      <ul className="exp rua-movs">
        {movs.map(m => (
          <li key={m.id}>
            <span>
              {m.tipo === 'pus' ? 'Pus' : 'Voltou'} em {dataCurta(m.data)}
              {m.nota && <small className="muted"> · {textoPrivado(m.nota, oculto)}</small>}
            </span>
            <span className="rua-valor">
              <Din v={m.valor} />
              {n.movimentos.length > 1 && !n.encerrado_em && (
                <button
                  className="iconbtn"
                  type="button"
                  onClick={() => tirar(m)}
                  aria-label={`Apagar o movimento de ${dataCurta(m.data)}`}
                  title="Apagar"
                >
                  <Icone desenho={Trash2} />
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Anota mais dinheiro posto ou dinheiro que voltou. O que volta pode ir direto para uma aplicação do Guardado. */
function NovoMovimento({ n, aplicacoes, salvar }: { n: Negocio; aplicacoes: GuardadoAplicacao[]; salvar: Salvar }) {
  const { api, familia } = useSessaoAtual()
  const { toast, tentar, recarregar } = useAcoes()
  const oculto = useOculto()
  const hoje = hojeRecife()
  const [tipo, setTipo] = useState<'pus' | 'voltou'>('voltou')
  const [valor, setValor] = useState('')
  const [quando, setQuando] = useState(hoje)
  const [nota, setNota] = useState('')
  const [destino, setDestino] = useState('')
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (f: () => Promise<void>) => f()), [])
  const minhas = aplicacoes.filter(a => aplicacaoMinha(a, familia))
  const anotar = () =>
    trava(async () => {
      const v = textoParaValor(valor)
      if (!valorDigitadoValido(valor) || v <= 0) {
        setErro('Digite o valor. Ex.: 5000.')
        return
      }
      if (!quando || quando > hoje) {
        setErro('A data não pode ser depois de hoje.')
        return
      }
      setGravando(true)
      setErro('')
      const m: MovimentoNegocio = {
        id: novoUuid(),
        data: quando,
        tipo,
        valor: v,
        ...(nota.trim() ? { nota: nota.trim() } : {}),
      }
      if (!(await salvar({ ...n, movimentos: [...n.movimentos, m] }))) {
        setGravando(false)
        return
      }
      const app = tipo === 'voltou' ? minhas.find(a => a.id === destino) : undefined
      const guardou =
        !!app &&
        (await tentar(() => api.guardadoMovimentar(app.id, 'aporte', v, quando, 'rua-' + m.id, `Voltou de ${n.nome}`)))
      if (guardou) await recarregar().catch(() => {})
      toast(
        tipo === 'pus'
          ? `Anotado: mais ${reais(v)} em ${n.nome}.`
          : guardou
            ? `Anotado: voltaram ${reais(v)} e já estão no Guardado (${app!.nome}).`
            : `Anotado: voltaram ${reais(v)} de ${n.nome}.${app ? ' No Guardado não entrou: anote por lá.' : ''}`,
      )
      setValor('')
      setNota('')
      setGravando(false)
    })
  return (
    <section className="rua-novo-mov" aria-labelledby="ruaNovoMov">
      <h3 id="ruaNovoMov">Anotar movimento</h3>
      <div className="seg compacta" role="group" aria-label="O que aconteceu">
        <button type="button" aria-pressed={tipo === 'voltou'} onClick={() => setTipo('voltou')}>
          <Icone nome="entrada" />
          Voltou dinheiro
        </button>
        <button type="button" aria-pressed={tipo === 'pus'} onClick={() => setTipo('pus')}>
          <Icone nome="gasto" />
          Pus mais
        </button>
      </div>
      <div className="duas-colunas">
        <div className="campo">
          <span>Valor</span>
          <CampoValor valor={valor} mudar={setValor} rotulo="Valor do movimento" />
        </div>
        <label className="campo">
          <span>Quando</span>
          <input className="inp" type="date" value={quando} max={hoje} onChange={e => setQuando(e.target.value)} />
        </label>
      </div>
      <label className="campo">
        <span>Do que foi (opcional)</span>
        <CampoPrivado
          className="inp"
          value={nota}
          maxLength={60}
          placeholder={tipo === 'pus' ? 'Ex.: documento, conserto' : 'Ex.: sinal da venda'}
          onChange={e => setNota(e.target.value)}
        />
      </label>
      {tipo === 'voltou' && minhas.length > 0 && (
        <label className="campo">
          <span>Guardar em</span>
          <select className="inp" value={destino} onChange={e => setDestino(e.target.value)}>
            <option value="">Ainda não guardei</option>
            {minhas.map(a => (
              <option key={a.id} value={a.id}>
                {textoPrivado(a.nome, oculto)}
              </option>
            ))}
          </select>
          <small>Escolhendo uma aplicação, o valor já entra no Guardado como dinheiro guardado a mais.</small>
        </label>
      )}
      {erro && (
        <p className="erro" role="alert">
          {textoPrivado(erro)}
        </p>
      )}
      <Botao variante="primario" className="full" type="button" disabled={gravando} onClick={anotar}>
        <Icone nome="salvo" />
        Anotar
      </Botao>
    </section>
  )
}
