import { useState } from 'react'
import { AlertTriangle, Gavel } from 'lucide-react'
import type { ImovelTela } from '../api/tipos'
import { useAcoes, useSessaoAtual } from '../app/contexto'
import { useOculto } from '../app/useOculto'
import {
  contaDoAno,
  ETAPAS,
  mesMais,
  type CadernoImovel,
  type EtapaProblema,
  type ProblemaAluguel,
} from '../lib/aluguel'
import { hojeRecife, mesCurto, somaDias, textoParaValor, valorDigitadoValido, valorParaTexto } from '../lib/formato'
import { textoPrivado } from '../lib/olho'
import { Botao, CampoValor, Din, Sheet } from './base'
import { Icone } from './Icone'
import { CampoPrivado } from './privacidade'

type Lembrar = 'semana' | 'mes' | 'nunca'
const ORDEM: EtapaProblema[] = ['cobrando', 'acordo', 'advogado', 'despejo', 'vazio', 'reforma']
const mm = (m: string) => `${m.slice(5, 7)}/${m.slice(2, 4)}`

/** O texto do lembrete da Secretária para cada providência (repete até a família concluir). */
export function tituloDoLembrete(etapa: EtapaProblema, apelido: string, quem: string | null) {
  // "do imóvel X" serve para "a sala", "o apartamento" e "a casa"; de quem cuida, só o nome (sem o telefone)
  const nome = (quem || '').split(/[,;(]| - /)[0].trim()
  if (etapa === 'advogado' || etapa === 'despejo')
    return `Cobrar ${nome || 'o advogado'} sobre o processo do imóvel ${apelido}`.slice(0, 120)
  if (etapa === 'cobrando') return `Cobrar o inquilino do imóvel ${apelido}`.slice(0, 120)
  if (etapa === 'acordo') return `Conferir a parcela do acordo do imóvel ${apelido}`.slice(0, 120)
  return `Ver como está o imóvel ${apelido} (${ETAPAS[etapa].frase})`.slice(0, 120)
}

/**
 * "Não me pagou": dentro do caderno do aluguel. Sem problema, um botão; com problema, o que está acontecendo,
 * o andamento, mudar a providência e "voltou a pagar". O plano, o celular e o Escritório passam a saber.
 */
export function ProblemaDoAluguel({
  imovel,
  c,
  gravar,
}: {
  imovel: ImovelTela
  c: CadernoImovel
  gravar: (c: CadernoImovel) => Promise<boolean>
}) {
  const [folha, setFolha] = useState(false)
  const p = c.problema
  return (
    <section aria-labelledby="alProblema" className="aluguel-problema">
      <h3 id="alProblema" className="lbl">
        Inquilino não pagou?
      </h3>
      {p ? (
        <ProblemaAberto imovel={imovel} c={c} p={p} gravar={gravar} mudar={() => setFolha(true)} />
      ) : (
        <>
          <p className="sub">
            Registre a providência (cobrar, advogado, despejo, imóvel vazio). O app para de contar com este aluguel até
            a volta e lembra você de acompanhar.
          </p>
          <Botao variante="secundario" type="button" onClick={() => setFolha(true)}>
            <Icone desenho={AlertTriangle} />
            Não me pagou
          </Botao>
        </>
      )}
      {folha && <FolhaProblema imovel={imovel} c={c} gravar={gravar} fechar={() => setFolha(false)} />}
    </section>
  )
}

function ProblemaAberto({
  imovel,
  c,
  p,
  gravar,
  mudar,
}: {
  imovel: ImovelTela
  c: CadernoImovel
  p: ProblemaAluguel
  gravar: (c: CadernoImovel) => Promise<boolean>
  mudar: () => void
}) {
  const oculto = useOculto()
  const { toast } = useAcoes()
  const [texto, setTexto] = useState('')
  const [resolver, setResolver] = useState(false)
  const anotar = async () => {
    const t = texto.trim()
    if (!t) return
    if (
      await gravar({
        ...c,
        problema: { ...p, andamento: [...p.andamento, { data: hojeRecife(), texto: t }].slice(-30) },
      })
    ) {
      setTexto('')
      toast('Andamento anotado.')
    }
  }
  return (
    <div className="todo warn problema-card" role="status">
      <p>
        <Icone desenho={Gavel} aria-hidden="true" /> <b>{ETAPAS[p.etapa].nome}</b> · sem receber desde {mm(p.desde)}
      </p>
      <p className="sub">
        {p.volta
          ? `A família acha que volta a receber em ${mesCurto(p.volta + '-01')}. Até lá o plano não conta com este aluguel.`
          : 'Ainda sem data para voltar a receber: o plano não conta com este aluguel até você dizer.'}
      </p>
      {p.advogado && <p className="sub">Quem cuida: {textoPrivado(p.advogado, oculto)}</p>}
      {p.divida > 0 && (
        <p className="sub">
          O inquilino deve <Din v={p.divida} />: a receber, pode não voltar. Não entra no guardado nem no plano.
        </p>
      )}
      {p.andamento.length > 0 && (
        <ul className="list problema-andamento">
          {p.andamento
            .slice(-5)
            .reverse()
            .map((a, i) => (
              <li key={a.data + i} className="li">
                <span className="m">
                  <small>{a.data.slice(8, 10) + '/' + a.data.slice(5, 7)}</small>
                  <span>{textoPrivado(a.texto, oculto)}</span>
                </span>
              </li>
            ))}
        </ul>
      )}
      <label className="campo">
        <span>O que aconteceu? (audiência, notificação, acordo)</span>
        <CampoPrivado
          className="inp"
          value={texto}
          maxLength={200}
          onChange={e => setTexto(e.target.value)}
          placeholder="Ex.: advogado protocolou a ação"
        />
      </label>
      <span className="row-btns">
        <Botao variante="secundario" type="button" disabled={!texto.trim()} onClick={anotar}>
          Anotar andamento
        </Botao>
        <Botao variante="fantasma" type="button" onClick={mudar}>
          Mudar a providência
        </Botao>
        <Botao variante="fantasma" type="button" onClick={() => setResolver(true)}>
          Voltou a pagar
        </Botao>
      </span>
      {resolver && (
        <Sheet titulo="Voltou a pagar?" fechar={() => setResolver(false)}>
          <p className="corpo">
            O {textoPrivado(imovel.apelido, oculto)} volta a contar no plano a partir de agora e o caderno volta a
            avisar atraso. O andamento anotado sai junto. Os lembretes de cobrança você conclui na Secretária.
          </p>
          <button
            className="btn primary full"
            type="button"
            onClick={async () => {
              if (await gravar({ ...c, problema: null })) {
                setResolver(false)
                toast('Problema resolvido. O aluguel volta a contar.')
              }
            }}
          >
            Sim, voltou a pagar
          </button>
          <button className="btn ghost full" type="button" onClick={() => setResolver(false)}>
            Ainda não
          </button>
        </Sheet>
      )}
    </div>
  )
}

function FolhaProblema({
  imovel,
  c,
  gravar,
  fechar,
}: {
  imovel: ImovelTela
  c: CadernoImovel
  gravar: (c: CadernoImovel) => Promise<boolean>
  fechar: () => void
}) {
  const { api, familia } = useSessaoAtual()
  const { toast, tentar } = useAcoes()
  const hoje = hojeRecife()
  const mesHoje = hoje.slice(0, 7)
  const p = c.problema
  const atrasados = contaDoAno(c, imovel.valor, hoje).atrasados
  const [etapa, setEtapa] = useState<EtapaProblema>(p?.etapa || 'cobrando')
  const [desde, setDesde] = useState(p?.desde || atrasados[0] || mesHoje)
  const [volta, setVolta] = useState<string>(p ? p.volta || '' : mesMais(mesHoje, 3))
  const [quem, setQuem] = useState(p?.advogado || '')
  const [divida, setDivida] = useState(
    valorParaTexto(p ? p.divida : Math.max(atrasados.length, 1) * imovel.aluguel) || '',
  )
  const [lembrar, setLembrar] = useState<Lembrar>(p ? 'nunca' : 'semana')
  const [salvando, setSalvando] = useState(false)
  const mesesDesde = Array.from({ length: 12 }, (_, i) => mesMais(mesHoje, -i))
  const mesesVolta = Array.from({ length: 24 }, (_, i) => mesMais(mesHoje, i + 1))
  const salvar = async () => {
    if (divida && !valorDigitadoValido(divida)) {
      toast('Confira quanto o inquilino deve: use só números e 1 vírgula.')
      return
    }
    setSalvando(true)
    const novo: ProblemaAluguel = {
      etapa,
      desde,
      volta: volta && volta > desde ? volta : null,
      advogado: quem.trim() ? quem.trim().slice(0, 80) : null,
      divida: divida ? textoParaValor(divida) : 0,
      andamento: [
        ...(p?.andamento || []),
        ...(!p || p.etapa !== etapa ? [{ data: hoje, texto: `Providência: ${ETAPAS[etapa].frase}` }] : []),
      ].slice(-30),
    }
    const ok = await gravar({ ...c, problema: novo })
    // a Secretária lembra de acompanhar (cobrar o advogado, o inquilino, o acordo) até a família concluir
    if (ok && lembrar !== 'nunca' && familia)
      await tentar(() =>
        api.lembreteCriar(familia.id, {
          titulo: tituloDoLembrete(etapa, imovel.apelido, novo.advogado),
          quando: `${somaDias(hoje, lembrar === 'semana' ? 7 : 30)}T09:00:00-03:00`,
          repetir: lembrar,
          detalhe: `Aluguel sem receber desde ${mm(desde)}.`,
        }),
      )
    setSalvando(false)
    if (ok) {
      toast(
        lembrar === 'nunca'
          ? 'Providência registrada. O plano não conta com este aluguel até a volta.'
          : `Providência registrada. A Secretária lembra ${lembrar === 'semana' ? 'toda semana' : 'todo mês'}.`,
      )
      fechar()
    }
  }
  return (
    <Sheet titulo="Não me pagou" subtitulo={imovel.apelido} fechar={fechar}>
      <div className="aluguel-folha">
        <EscolherEtapa etapa={etapa} mudar={setEtapa} />
        <label className="campo">
          <span>Sem receber desde</span>
          <select className="inp" value={desde} onChange={e => setDesde(e.target.value)}>
            {mesesDesde.map(m => (
              <option key={m} value={m}>
                {mesCurto(m + '-01')}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Até quando acha que fica sem receber?</span>
          <select className="inp" value={volta} onChange={e => setVolta(e.target.value)}>
            <option value="">Não sei ainda</option>
            {mesesVolta.map(m => (
              <option key={m} value={m}>
                Volta em {mesCurto(m + '-01')}
              </option>
            ))}
          </select>
          <small>Até lá o plano não conta com este aluguel e o celular para de avisar atraso dele.</small>
        </label>
        <label className="campo">
          <span>Quem cuida do caso (advogado, imobiliária)</span>
          <CampoPrivado
            className="inp"
            value={quem}
            maxLength={80}
            onChange={e => setQuem(e.target.value)}
            placeholder="Ex.: Dra. Paula, 81 9 9999-0000"
          />
        </label>
        <label className="campo">
          <span>Quanto o inquilino deve até agora</span>
          <CampoValor valor={divida} mudar={v => setDivida(v.replace(/[^\d,]/g, ''))} />
          <small>Fica anotado como a receber. Não entra no guardado nem no plano até voltar.</small>
        </label>
        <EscolherLembrete lembrar={lembrar} mudar={setLembrar} />
        <button className="btn primary full" type="button" disabled={salvando} onClick={salvar}>
          Registrar a providência
        </button>
      </div>
    </Sheet>
  )
}

/** Cobrar, acordo, advogado, despejo, vazio ou reforma. */
function EscolherEtapa({ etapa, mudar }: { etapa: EtapaProblema; mudar: (e: EtapaProblema) => void }) {
  return (
    <section>
      <p className="lbl">O que você vai fazer?</p>
      <div className="pills" role="group" aria-label="Providência">
        {ORDEM.map(e => (
          <button key={e} type="button" className="pill" aria-pressed={etapa === e} onClick={() => mudar(e)}>
            {ETAPAS[e].nome}
          </button>
        ))}
      </div>
    </section>
  )
}

const OPCOES_LEMBRAR = [
  ['semana', 'Toda semana'],
  ['mes', 'Todo mês'],
  ['nunca', 'Não lembrar'],
] as const
/** De quanto em quanto tempo a Secretária lembra de acompanhar o caso (cobrar o advogado, o inquilino, o acordo). */
function EscolherLembrete({ lembrar, mudar }: { lembrar: Lembrar; mudar: (l: Lembrar) => void }) {
  return (
    <section>
      <p className="lbl">Lembrar de acompanhar</p>
      <div className="pills" role="group" aria-label="Lembrar de acompanhar">
        {OPCOES_LEMBRAR.map(([v, t]) => (
          <button key={v} type="button" className="pill" aria-pressed={lembrar === v} onClick={() => mudar(v)}>
            {t}
          </button>
        ))}
      </div>
    </section>
  )
}
