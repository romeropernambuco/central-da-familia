import { useMemo, useState } from 'react'
import type { Etiqueta } from '../../api/tipos'
import { useAcoes, useSessaoAtual } from '../../app/contexto'
import { Botao, Sheet } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { CampoPrivado } from '../../componentes/privacidade'
import { textoPrivado } from '../../lib/olho'
import { erroDaEtiqueta } from '../../lib/etiquetas'
import { umaPorVez } from '../../lib/seguro'

const MOEDAS: [string, string][] = [
  ['BRL', 'Real (R$)'],
  ['EUR', 'Euro (€)'],
  ['USD', 'Dólar (US$)'],
  ['GBP', 'Libra (£)'],
]
const fraseDoSalvo = (nome: string, arquivada: boolean, aplicada: number) =>
  arquivada
    ? `${nome} foi arquivada. Os gastos continuam onde estavam.`
    : aplicada
      ? `Etiqueta salva. Ela entrou em ${aplicada === 1 ? '1 gasto que já estava anotado' : `${aplicada} gastos que já estavam anotados`} no período.`
      : 'Etiqueta salva.'

/** Cria ou muda uma etiqueta: nome, início, fim, moeda e pessoas. Só o casal abre esta folha. */
export function NovaEtiqueta({
  atual,
  fechar,
  salvou,
}: {
  atual: Etiqueta | null
  fechar: () => void
  salvou: () => void
}) {
  const { api, familia } = useSessaoAtual()
  const { toast, recarregar } = useAcoes()
  const [nome, setNome] = useState(atual?.nome || '')
  const [inicio, setInicio] = useState(atual?.inicio || '')
  const [fim, setFim] = useState(atual?.fim || '')
  const [moeda, setMoeda] = useState(atual?.moeda || 'BRL')
  const [pessoas, setPessoas] = useState(atual?.pessoas ? String(atual.pessoas) : '')
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const trava = useMemo(() => umaPorVez(async (f: () => Promise<void>) => f()), [])

  const gravar = (arquivada: boolean) =>
    trava(async () => {
      if (!familia || !api.etiquetaSalvar) return
      const falta = erroDaEtiqueta({ nome, inicio, fim, moeda, pessoas })
      if (falta) {
        setErro(falta)
        return
      }
      setGravando(true)
      setErro('')
      try {
        const nova = {
          nome: nome.trim(),
          inicio: inicio || null,
          fim: fim || null,
          moeda: moeda.trim().toUpperCase(),
          pessoas: pessoas.trim() ? Number(pessoas) : null,
          arquivada,
        }
        const r = await api.etiquetaSalvar(familia.id, nova, atual?.id)
        await recarregar().catch(() => {})
        toast(fraseDoSalvo(r.etiqueta.nome, arquivada, r.aplicada_em))
        salvou()
      } catch (e) {
        setErro((e as Error).message)
        setGravando(false)
      }
    })

  return (
    <Sheet
      titulo={atual ? 'Mudar etiqueta' : 'Nova etiqueta'}
      subtitulo="Uma viagem, um evento ou um projeto"
      fechar={() => {
        if (!gravando) fechar()
      }}
    >
      <label className="campo">
        <span>Nome</span>
        <CampoPrivado
          className="inp"
          value={nome}
          maxLength={60}
          placeholder="Ex.: Europa nov/26"
          onChange={e => setNome(e.target.value)}
        />
      </label>
      <div className="duas-datas">
        <label className="campo">
          <span>Começa em</span>
          <input className="inp" type="date" value={inicio} onChange={e => setInicio(e.target.value)} />
        </label>
        <label className="campo">
          <span>Termina em</span>
          <input
            className="inp"
            type="date"
            value={fim}
            min={inicio || undefined}
            onChange={e => setFim(e.target.value)}
          />
        </label>
      </div>
      <p className="sub">
        Com as 2 datas, todo gasto anotado nesse período já entra na etiqueta sozinho, inclusive os que já estão
        anotados. Sem datas, você marca gasto por gasto.
      </p>
      <CampoMoeda moeda={moeda} mudar={setMoeda} />
      <label className="campo">
        <span>Quantas pessoas (opcional)</span>
        <input
          className="inp"
          inputMode="numeric"
          value={pessoas}
          maxLength={2}
          placeholder="Em branco: quem é da família"
          onChange={e => setPessoas(e.target.value.replace(/\D/g, ''))}
        />
        <small>Serve para a conta do gasto por pessoa por dia.</small>
      </label>
      {erro && (
        <p className="erro" role="alert">
          {textoPrivado(erro)}
        </p>
      )}
      <Botao variante="primario" className="full" type="button" disabled={gravando} onClick={() => gravar(false)}>
        <Icone nome="salvo" />
        {atual ? 'Salvar mudança' : 'Criar etiqueta'}
      </Botao>
      {atual && (
        <Botao variante="fantasma" type="button" disabled={gravando} onClick={() => gravar(true)}>
          Arquivar esta etiqueta
        </Botao>
      )}
    </Sheet>
  )
}

/** As 4 moedas mais comuns num toque; "Outra" abre o campo da sigla de 3 letras. */
function CampoMoeda({ moeda, mudar }: { moeda: string; mudar: (m: string) => void }) {
  const [outra, setOutra] = useState(!MOEDAS.some(([m]) => m === moeda))
  return (
    <div className="campo">
      <span id="etqMoeda">Moeda da viagem</span>
      <div className="pills" role="group" aria-labelledby="etqMoeda">
        {MOEDAS.map(([m, rotulo]) => (
          <button
            key={m}
            type="button"
            className="pill"
            aria-pressed={!outra && moeda === m}
            onClick={() => {
              setOutra(false)
              mudar(m)
            }}
          >
            {rotulo}
          </button>
        ))}
        <button
          type="button"
          className="pill"
          aria-pressed={outra}
          onClick={() => {
            setOutra(true)
            mudar('')
          }}
        >
          Outra
        </button>
      </div>
      {outra && (
        <input
          className="inp"
          value={moeda}
          maxLength={3}
          placeholder="3 letras, como CHF"
          aria-label="Sigla da moeda"
          onChange={e => mudar(e.target.value.toUpperCase())}
        />
      )}
      <small>Se não for real, o Anotar pergunta também o valor na moeda de lá.</small>
    </div>
  )
}
