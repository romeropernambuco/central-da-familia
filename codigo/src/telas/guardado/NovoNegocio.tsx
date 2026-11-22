import { useMemo, useState } from 'react'
import { useAcoes, useSessaoAtual } from '../../app/contexto'
import { Botao, CampoValor, Sheet } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { CampoDecimal, CampoPrivado } from '../../componentes/privacidade'
import { hojeRecife, textoParaValor, valorComCentavos, valorDigitadoValido } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { novoUuid, umaPorVez } from '../../lib/seguro'
import { NOME_DO_TIPO, TIPOS_NEGOCIO, erroDoNegocio, type Negocio, type TipoNegocio } from '../../lib/dinheiroNaRua'

interface Ficha {
  nome: string
  tipo: TipoNegocio
  valor: string
  quando: string
  comQuem: string
  parte: string
  prazo: string
  volta: string
  combinado: string
}
type Mudar = <K extends keyof Ficha>(campo: K, valor: Ficha[K]) => void

const fichaDe = (atual: Negocio | null, hoje: string): Ficha => ({
  nome: atual?.nome || '',
  tipo: atual?.tipo || 'veiculo',
  valor: '',
  quando: hoje,
  comQuem: atual?.com_quem || '',
  parte: String(atual?.minha_parte ?? 100),
  prazo: atual?.prazo || '',
  volta: atual?.volta_prevista ? valorComCentavos(atual.volta_prevista) : '',
  combinado: atual?.combinado || '',
})
function erroDaFicha(f: Ficha, hoje: string, novo: boolean) {
  return (
    erroDoNegocio({
      nome: f.nome,
      prazo: f.prazo,
      valor: textoParaValor(f.valor),
      minha_parte: f.parte,
      hoje,
      novo,
    }) ||
    (novo && !valorDigitadoValido(f.valor) ? 'Digite quanto você pôs. Ex.: 30000.' : '') ||
    (f.volta && !valorDigitadoValido(f.volta) ? 'Confira o valor que você espera de volta.' : '')
  )
}
function negocioDaFicha(f: Ficha, atual: Negocio | null, dono: string | null): Negocio {
  return {
    id: atual?.id || novoUuid(),
    nome: f.nome.trim(),
    tipo: f.tipo,
    com_quem: f.comQuem.trim() || undefined,
    minha_parte: Number(f.parte.replace(',', '.')),
    combinado: f.combinado.trim() || undefined,
    prazo: f.prazo,
    volta_prevista: f.volta ? textoParaValor(f.volta) : null,
    dono: atual ? atual.dono : dono,
    movimentos: atual
      ? atual.movimentos
      : [{ id: novoUuid(), data: f.quando, tipo: 'pus', valor: textoParaValor(f.valor), nota: 'Primeiro dinheiro' }],
    encerrado_em: atual?.encerrado_em ?? null,
    criado_em: atual?.criado_em || new Date().toISOString(),
  }
}

/** Cria ou muda um negócio: o que é, com quem está, quanto saiu, a sua parte, o prazo e quanto espera de volta. */
export function NovoNegocio({
  atual,
  salvar,
  apagar,
  fechar,
}: {
  atual: Negocio | null
  salvar: (n: Negocio) => Promise<boolean>
  apagar: (n: Negocio) => Promise<boolean>
  fechar: () => void
}) {
  const { familia } = useSessaoAtual()
  const { toast } = useAcoes()
  const hoje = hojeRecife()
  const [f, setF] = useState(() => fichaDe(atual, hoje))
  const mudar: Mudar = (campo, valor) => setF(x => ({ ...x, [campo]: valor }))
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (g: () => Promise<void>) => g()), [])

  const gravar = () =>
    trava(async () => {
      const falta = erroDaFicha(f, hoje, !atual)
      if (falta) {
        setErro(falta)
        return
      }
      setGravando(true)
      setErro('')
      const n = negocioDaFicha(f, atual, familia?.membroId ?? null)
      if (await salvar(n)) {
        toast(atual ? 'Negócio atualizado.' : `Anotado: ${n.nome} está na rua.`)
        fechar()
      } else setGravando(false)
    })
  const apagarEste = async () => {
    if (!atual || !window.confirm('Apagar este negócio e todos os movimentos dele? O Guardado não muda.')) return
    if (await apagar(atual)) {
      toast('Negócio apagado.', async () => {
        await salvar(atual)
      })
      fechar()
    }
  }

  return (
    <Sheet
      titulo={atual ? 'Mudar negócio' : 'Novo negócio'}
      subtitulo="Dinheiro que saiu e tem que voltar"
      fechar={() => {
        if (!gravando) fechar()
      }}
    >
      <OQueE f={f} mudar={mudar} novo={!atual} hoje={hoje} />
      <ComQuemEPrazo f={f} mudar={mudar} />
      {erro && (
        <p className="erro" role="alert">
          {textoPrivado(erro)}
        </p>
      )}
      <Botao variante="primario" className="full" type="button" disabled={gravando} onClick={gravar}>
        <Icone nome="salvo" />
        {atual ? 'Salvar mudança' : 'Anotar negócio'}
      </Botao>
      {atual && (
        <Botao variante="fantasma" type="button" disabled={gravando} onClick={apagarEste}>
          Apagar este negócio
        </Botao>
      )}
    </Sheet>
  )
}

function OQueE({ f, mudar, novo, hoje }: { f: Ficha; mudar: Mudar; novo: boolean; hoje: string }) {
  return (
    <>
      <label className="campo">
        <span>O que é</span>
        <CampoPrivado
          className="inp"
          value={f.nome}
          maxLength={60}
          placeholder="Ex.: Carro para revender"
          onChange={e => mudar('nome', e.target.value)}
        />
      </label>
      <div className="campo">
        <span id="ruaTipo">Tipo</span>
        <div className="pills" role="group" aria-labelledby="ruaTipo">
          {TIPOS_NEGOCIO.map(t => (
            <button key={t} type="button" className="pill" aria-pressed={f.tipo === t} onClick={() => mudar('tipo', t)}>
              {NOME_DO_TIPO[t]}
            </button>
          ))}
        </div>
      </div>
      {novo && (
        <div className="duas-colunas">
          <div className="campo">
            <span>Quanto você pôs</span>
            <CampoValor valor={f.valor} mudar={v => mudar('valor', v)} rotulo="Quanto você pôs" />
          </div>
          <label className="campo">
            <span>Quando saiu</span>
            <input
              className="inp"
              type="date"
              value={f.quando}
              max={hoje}
              onChange={e => mudar('quando', e.target.value)}
            />
          </label>
        </div>
      )}
    </>
  )
}

function ComQuemEPrazo({ f, mudar }: { f: Ficha; mudar: Mudar }) {
  return (
    <>
      <div className="duas-colunas">
        <label className="campo">
          <span>Com quem está (opcional)</span>
          <CampoPrivado
            className="inp"
            value={f.comQuem}
            maxLength={40}
            placeholder="Sócio ou quem toca"
            onChange={e => mudar('comQuem', e.target.value)}
          />
        </label>
        <label className="campo">
          <span>Sua parte no lucro (%)</span>
          <CampoDecimal
            className="inp"
            value={f.parte}
            maxLength={5}
            onChange={e => mudar('parte', e.target.value.replace(/[^\d,.]/g, ''))}
          />
        </label>
      </div>
      <label className="campo">
        <span>Até quando o dinheiro tem que voltar</span>
        <input className="inp" type="date" value={f.prazo} onChange={e => mudar('prazo', e.target.value)} />
        <small>Todo dinheiro na rua tem prazo. Perto da data, o negócio aparece como "vence logo".</small>
      </label>
      <div className="campo">
        <span>Quanto espera receber de volta (opcional)</span>
        <CampoValor valor={f.volta} mudar={v => mudar('volta', v)} rotulo="Quanto espera receber de volta" />
        <small>O que você pôs mais a sua parte do lucro. Se ainda não sabe, deixe em branco.</small>
      </div>
      <label className="campo">
        <span>O que foi combinado (opcional)</span>
        <CampoPrivado
          className="inp"
          value={f.combinado}
          maxLength={200}
          placeholder="Ex.: metade de cada um, lucro meio a meio"
          onChange={e => mudar('combinado', e.target.value)}
        />
      </label>
    </>
  )
}
