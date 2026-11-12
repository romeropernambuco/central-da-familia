import { useEffect, useState } from 'react'
import { novoUuid } from '../../lib/seguro'
import { useConfig } from '../../app/useConfig'
import { Users, ShoppingBasket, Flame, Wrench, FileText, Plus, MessageCircle, Check, KeyRound, CalendarDays, Trash2, Camera, LogOut, Copy } from 'lucide-react'
import { LerCupom } from '../../componentes/LerCupom'
import { useApp } from '../../app/contexto'
import { PrecisaDeVoce } from '../escritorio/Escritorio'
import { Din, Sheet, Vazio } from '../../componentes/base'
import { FuncIco } from '../../componentes/Pergunta'
import { Qm } from '../../componentes/Qm'
import type { CasaDaEquipe, Lancamento, MarcaCasa } from '../../api/tipos'
import type { Folha, PessoaFolha } from '../escritorio/ajudantes'
import { avisoDAE, centavos, dataCurta, diaSemana, hojeRecife, linkEquipe, linkWhatsApp, mensagemConvite, previsaoGas, reais, reservaFolha, segundaDaSemana, somaDias, textoParaValor } from '../../lib/formato'

type Aba = 'feira' | 'prestadores' | 'gas' | 'folha'
interface Item { id: string; nome: string; ok: boolean }
interface Prestador { id: string; nome: string; servico: string; dia: number; valor: number; ultimaVez?: string }
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const novoId = () => novoUuid().slice(0, 8)

/** Casa: feira da semana, prestadores, gás e Folha da Casa. A equipe tem a tela dela (CasaEquipe), sem nenhum valor em dinheiro. */
export function Casa() {
  const { familia } = useApp()
  const equipe = familia?.papel === 'equipe'
  const [aba, setAba] = useState<Aba>('feira')
  if (equipe) return <CasaEquipe />
  const abas: [Aba, string, JSX.Element][] = [
    ['feira', 'Feira', <ShoppingBasket size={18} />],
    ...(!equipe ? [['prestadores', 'Serviços', <Wrench size={18} />] as [Aba, string, JSX.Element]] : []),
    ['gas', 'Gás', <Flame size={18} />],
    ...(!equipe ? [['folha', 'Folha', <FileText size={18} />] as [Aba, string, JSX.Element]] : []),
  ]
  return (
    <div className="view">
      {equipe && <p className="todo"><Users size={20} aria-hidden="true" /><span>Olá, {familia?.membroNome}! Aqui você anota o que comprou pra casa e marca a lista. Toque no botão verde pra lançar uma compra.</span></p>}
      <div className="segbar"><div className="seg compacta" role="group" aria-label="Parte da casa">
        {abas.map(([k, nome, ico]) => <button key={k} type="button" aria-pressed={aba === k} onClick={() => setAba(k)}>{ico}{nome}</button>)}
      </div></div>
      {aba === 'feira' && <Feira />}
      {aba === 'prestadores' && <Prestadores />}
      {aba === 'gas' && <Gas />}
      {aba === 'folha' && <FolhaCasa />}
    </div>
  )
}

const FalhaConfig = ({ m }: { m: string }) => (m ? <p className="aviso-erro" role="alert">Não deu pra abrir o que está salvo: {m} Nada foi apagado. Quando a internet voltar, a tela se atualiza sozinha.</p> : null)

function Feira() {
  const { api, familia, resumo, versao, tentar, toast } = useApp()
  const hoje = hojeRecife()
  const [lista, setLista, falhaLista] = useConfig<Item[]>('casa_lista', [])
  const [pres, setPres] = useConfig<Record<string, string[]>>('casa_presenca', {})
  const [ponto] = useConfig<Record<string, Record<string, { chegou?: string; saiu?: string }>>>('casa_ponto', {})
  const [cupom, setCupom] = useState(false)
  const [folha] = useConfig<Folha>('casa_folha', { pessoas: [], daePaga: {} })
  const [lanc, setLanc] = useState<Lancamento[]>([])
  const [novo, setNovo] = useState('')
  const [cod, setCod] = useState<{ nome: string; codigo: string; link: string } | null>(null)
  const [gerando, setGerando] = useState(false)
  useEffect(() => { if (familia) api.lancamentos(familia.id, hoje.slice(0, 7)).then(setLanc).catch(() => {}) }, [api, familia?.id, versao])
  const casaIds = new Set((resumo?.envelopes || []).filter(e => e.casa).map(e => e.id))
  const saiuHoje = centavos(lanc.filter(l => !l.apagado_em && l.data === hoje && casaIds.has(l.envelope_id)).reduce((s, l) => s + l.valor, 0))
  const feira = (resumo?.envelopes || []).find(e => e.regra === 'semanal' && e.casa) || (resumo?.envelopes || []).find(e => e.casa)
  const [avisos, setAvisos] = useState<{ tipo: string; data: string; nome: string }[]>([])
  useEffect(() => { if (familia && familia.papel === 'casal') api.avisosCasa(familia.id).then(setAvisos).catch(() => {}) }, [api, familia?.id, versao])
  const veioEquipe = avisos.filter(a => a.tipo === 'casa_presenca' && a.data === hoje).map(a => a.nome)
  const veio = [...new Set([...(pres[hoje] || []), ...veioEquipe])]
  const equipe = familia?.papel === 'equipe'
  const nomes = equipe ? [familia!.membroNome] : folha.pessoas.map(p => p.nome)
  const togglePres = (n: string) => setPres({ ...pres, [hoje]: veio.includes(n) ? veio.filter(x => x !== n) : [...veio, n] })
  const livreSem = feira?.teto_semana != null ? centavos(feira.teto_semana - (feira.gasto_semana || 0)) : null

  return (
    <div className="tela-larga">
      <div className="col">
        <FalhaConfig m={falhaLista} />
        <section className="card" aria-labelledby="fHoje">
          <div className="card-h"><h2 id="fHoje"><Users size={24} aria-hidden="true" />Hoje, {diaSemana(hoje)} {dataCurta(hoje)}</h2></div>
          <p className="sub" style={{ marginTop: -8, marginBottom: 12 }}>quem veio e o que saiu pra casa</p>
          <div className="duas">
            <div>
              <p className="lbl">Quem veio</p>
              {nomes.length ? (
                <div className="pills" style={{ marginTop: 8 }}>{nomes.map(n => <button key={n} type="button" className="pill" aria-pressed={veio.includes(n)} onClick={() => togglePres(n)}>{veio.includes(n) && <Check size={16} />}{n}</button>)}</div>
              ) : <p className="sub" style={{ marginTop: 6 }}>Equipe ainda não cadastrada. Cadastre na aba Folha.</p>}
              {Object.entries(ponto[hoje] || {}).map(([n, h]) => <p key={n} className="sub" style={{ marginTop: 6 }}>{n}: chegou {h.chegou || 'sem hora'}{h.saiu ? `, saiu ${h.saiu}` : ''}</p>)}
            </div>
            <div>
              <p className="lbl">O que saiu</p>
              <Din v={saiuHoje} tam="mid" />
              <p className="sub">{saiuHoje ? 'em compras da casa hoje' : 'nenhuma compra hoje'}</p>
            </div>
          </div>
        </section>

        {feira && !equipe && (
          <section className="card" aria-labelledby="fSem">
            <div className="card-h"><h2 id="fSem">Semana de {dataCurta(segundaDaSemana(hoje))}</h2></div>
            <p className="lbl">{feira.nome}: livre nesta semana</p>
            <div className="numrow"><Din v={Math.max(0, livreSem ?? feira.livre)} tam="big" />
              <Qm titulo={`${feira.nome}: livre nesta semana`} linhas={feira.teto_semana != null ? [
                { linha: 'Teto da semana', valor: feira.teto_semana }, { linha: 'Já gasto desde segunda', valor: -(feira.gasto_semana || 0) }, { linha: 'Livre nesta semana', valor: livreSem! },
              ] : [{ linha: 'Combinado do mês', valor: feira.limite_mes }, { linha: 'Já gasto', valor: -feira.gasto_mes }, { linha: 'Livre', valor: feira.livre }]} />
            </div>
            <p className="sub">Gasto da semana <b>{reais(feira.gasto_semana || 0)}</b>{feira.teto_semana != null ? ` de ${reais(feira.teto_semana)}` : ''}</p>
            <div className="meter ok" style={{ marginTop: 10 }} aria-hidden="true"><i style={{ width: Math.min(100, ((feira.gasto_semana || 0) / (feira.teto_semana || 1)) * 100) + '%' }} /></div>
            {livreSem != null && livreSem < 0 && <p className="todo" style={{ marginTop: 12 }}>A semana passou {reais(-livreSem)} do teto. Fica a conferir na conversa da casa, sem culpa.</p>}
            <button className="btn line" type="button" style={{ marginTop: 14 }} onClick={() => setCupom(true)}><Camera size={20} />Ler cupom com foto</button>
          </section>
        )}
      </div>

      <div className="col">
        <section className="card" aria-labelledby="fLista">
          <div className="card-h"><h2 id="fLista">Lista de compras</h2><span className="chip">{lista.filter(i => !i.ok).length} faltam</span></div>
          <ul className="list">
            {lista.map(i => (
              <li key={i.id} className="li" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                <label className="check" style={{ gridColumn: '1 / 3' }}><input type="checkbox" checked={i.ok} onChange={() => setLista(lista.map(x => x.id === i.id ? { ...x, ok: !x.ok } : x))} /><span style={{ textDecoration: i.ok ? 'line-through' : 'none', color: i.ok ? 'var(--muted)' : 'inherit' }}>{i.nome}</span></label>
                <button className="iconbtn quieto" type="button" aria-label={`Tirar ${i.nome} da lista`} onClick={() => setLista(lista.filter(x => x.id !== i.id))}><Trash2 size={20} /></button>
              </li>
            ))}
          </ul>
          {!lista.length && !falhaLista && <Vazio ico={<ShoppingBasket size={24} />}>A lista está vazia. Escreva abaixo o que falta em casa.</Vazio>}
          <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={e => { e.preventDefault(); if (novo.trim()) { setLista([...lista, { id: novoId(), nome: novo.trim(), ok: false }]); setNovo('') } }}>
            <input className="inp" placeholder="Acrescentar item" value={novo} onChange={e => setNovo(e.target.value)} aria-label="Novo item da lista" />
            <button className="btn line" type="submit" aria-label="Acrescentar"><Plus size={20} /></button>
          </form>
        </section>

        {!equipe && (
          <section className="card" aria-labelledby="fEq">
            <div className="card-h"><h2 id="fEq">Equipe no app</h2></div>
            <p className="sub" style={{ marginBottom: 10 }}>Quem trabalha na casa entra por um link que você manda, mais um código de 4 números. Sem e-mail. Vê só a tela da Casa, nunca o dinheiro do casal.</p>
            {folha.pessoas.length ? folha.pessoas.map(p => (
              <div key={p.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <span className="m"><b>{p.nome}</b><small>{p.funcao}</small></span>
                <button className="btn sm line" type="button" disabled={gerando} onClick={async () => {
                  setGerando(true)
                  await tentar(async () => {
                    const r = await api.convidar(familia!.id, 'equipe', p.nome)
                    // o link leva o id do convite; o código de 4 números vai separado. Sem os 2, ninguém entra.
                    if (!r.codigo_4_digitos || !r.convite) throw new Error('O banco não devolveu o link e o código. Tente de novo.')
                    setCod({ nome: p.nome, codigo: r.codigo_4_digitos, link: linkEquipe(location.origin + location.pathname + location.search, r.convite) })
                  })
                  setGerando(false)
                }}><KeyRound size={16} />Gerar código</button>
              </div>
            )) : <p className="sub">Cadastre a equipe na aba Folha primeiro.</p>}
          </section>
        )}
      </div>
      {cupom && <LerCupom fechar={() => setCupom(false)} envelopePadrao={feira?.id} />}
      {cod && (
        <Sheet titulo={`Convite de ${cod.nome}`} fechar={() => setCod(null)}>
          <p className="lbl" style={{ justifyContent: 'center' }}>Código de 4 números</p>
          <p className="din big" style={{ letterSpacing: '.2em', textAlign: 'center' }} aria-label={'Código ' + cod.codigo.split('').join(' ')}>{cod.codigo}</p>
          <p className="sub" style={{ textAlign: 'center' }}>{cod.nome} precisa das 2 coisas: abrir o link abaixo e digitar o código. Vale por 24 horas. Depois de 5 erros, gere outro.</p>
          <p className="linkbox" aria-label="Link do convite">{cod.link}</p>
          <a className="btn primary full" target="_blank" rel="noreferrer" href={linkWhatsApp(mensagemConvite('equipe', { familia: familia!.nome, quem: cod.nome, link: cod.link, codigo: cod.codigo }))}><MessageCircle size={20} />Abrir o WhatsApp com a mensagem</a>
          <button className="btn line full" type="button" onClick={() => tentar(async () => { await navigator.clipboard.writeText(cod.link); toast('Link copiado. O código vai separado: ' + cod.codigo) })}><Copy size={20} />Copiar só o link</button>
          <p className="sub">O app só abre o WhatsApp com o texto pronto. Quem escolhe a conversa e envia é você.</p>
        </Sheet>
      )}
    </div>
  )
}

function proxDia(hoje: string, dow: number): string {
  for (let i = 0; i < 7; i++) { const d = somaDias(hoje, i); if (DIAS.indexOf(diaSemana(d)) === dow) return d }
  return hoje
}

function Prestadores() {
  const { abrirLancar, resumo } = useApp()
  const hoje = hojeRecife()
  const [ps, setPs, falhaPs] = useConfig<Prestador[]>('casa_prestadores', [])
  const [novo, setNovo] = useState(false)
  const casaMensal = (resumo?.envelopes || []).find(e => e.casa && e.regra === 'mensal')
  return (
    <div className="view">
      <FalhaConfig m={falhaPs} />
      <p className="todo"><CalendarDays size={20} aria-hidden="true" /><span>Jardineiro, piscineiro, diarista: o app lembra na véspera com a mensagem pronta. Quando a pessoa vier, toque em "Veio hoje" e o pagamento já abre pra lançar.</span></p>
      {!ps.length && !falhaPs && <div className="card"><Vazio ico={<Wrench size={24} />}>Nenhum serviço cadastrado. Ex.: jardineiro toda sexta, piscineiro toda quarta.</Vazio></div>}
      <div className="envs">
        {ps.map(p => {
          const prox = proxDia(hoje, p.dia)
          const amanha = prox === somaDias(hoje, 1)
          const ehHoje = prox === hoje
          const msg = `Oi, ${p.nome}! Confirmando ${ehHoje ? 'hoje' : amanhã(prox, hoje)} aqui em casa. Tudo certo?`
          return (
            <section className="card env" key={p.id} aria-label={p.servico + ' ' + p.nome}>
              <div className="env-h"><b>{p.servico}: {p.nome}</b><span className="regra">toda {DIAS[p.dia]}</span></div>
              <div className="numrow"><Din v={p.valor} tam="mid" /><span className="sub">por visita</span></div>
              <p className="sub">Próxima visita <b>{ehHoje ? 'hoje' : dataCurta(prox)}</b>{p.ultimaVez ? ` · veio por último ${dataCurta(p.ultimaVez)}` : ''}</p>
              {(amanha || ehHoje) && <p className="todo warn">{ehHoje ? 'É hoje.' : 'É amanhã.'} Mande a confirmação.</p>}
              <div className="row-btns">
                <a className="btn sm line" target="_blank" rel="noreferrer" href={linkWhatsApp(msg)}><MessageCircle size={16} />Confirmar</a>
                <button className="btn sm primary" type="button" onClick={() => { setPs(ps.map(x => x.id === p.id ? { ...x, ultimaVez: hoje } : x)); abrirLancar({ envelope: casaMensal?.id, valor: p.valor, descricao: `${p.servico} ${p.nome}` }) }}><Check size={16} />Veio hoje</button>
              </div>
            </section>
          )
        })}
      </div>
      <button className="btn line" type="button" style={{ justifySelf: 'start' }} onClick={() => setNovo(true)}><Plus size={20} />Novo serviço</button>
      {novo && <NovoPrestador fechar={() => setNovo(false)} salvar={p => { setPs([...ps, p]); setNovo(false) }} />}
    </div>
  )
}
function amanhã(d: string, hoje: string) { return d === somaDias(hoje, 1) ? 'amanhã' : `${diaSemana(d)}, ${dataCurta(d)}` }

function NovoPrestador({ fechar, salvar }: { fechar: () => void; salvar: (p: Prestador) => void }) {
  const [nome, setNome] = useState(''), [serv, setServ] = useState(''), [dia, setDia] = useState(6), [valor, setValor] = useState('')
  return (
    <Sheet titulo="Novo serviço da casa" fechar={fechar}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={e => { e.preventDefault(); if (nome && serv) salvar({ id: novoId(), nome, servico: serv, dia, valor: textoParaValor(valor) }) }}>
        <label className="campo"><span>Serviço</span><input className="inp" placeholder="Ex.: Jardineiro" value={serv} onChange={e => setServ(e.target.value)} /></label>
        <label className="campo"><span>Nome da pessoa</span><input className="inp" value={nome} onChange={e => setNome(e.target.value)} /></label>
        <div className="campo"><span>Dia que vem</span><div className="pills">{DIAS.map((d, i) => <button key={d} type="button" className="pill" aria-pressed={dia === i} onClick={() => setDia(i)}>{d.slice(0, 3)}</button>)}</div></div>
        <label className="campo"><span>Valor por visita</span><input className="inp" inputMode="decimal" value={valor} onChange={e => setValor(e.target.value.replace(/[^\d,]/g, ''))} /></label>
        <button className="btn primary full" type="submit">Salvar</button>
      </form>
    </Sheet>
  )
}

function Gas() {
  const { api, familia, versao } = useApp()
  const hoje = hojeRecife()
  const [gasCfg, setGas, falhaGas] = useConfig<{ trocas: string[] }>('casa_gas', { trocas: [] })
  const [daEquipe, setDaEquipe] = useState<string[]>([])
  useEffect(() => { if (familia) api.avisosCasa(familia.id).then(a => setDaEquipe(a.filter(x => x.tipo === 'casa_gas').map(x => x.data))).catch(() => {}) }, [api, familia?.id, versao])
  // trocas anotadas pelo casal (config) + trocas avisadas pela equipe (eventos)
  const gas = { trocas: [...new Set([...gasCfg.trocas, ...daEquipe])].sort() }
  const p = previsaoGas(gas.trocas)
  const hora = p.avisar && hoje >= p.avisar
  return (
    <div className="tela-larga">
      <section className="card" aria-labelledby="gT">
        <FalhaConfig m={falhaGas} />
        <div className="card-h"><h2 id="gT"><Flame size={24} aria-hidden="true" />Gás de cozinha</h2></div>
        {p.media ? (
          <>
            <p className="lbl">Um botijão dura em média</p>
            <p className="din big">{p.media}<span className="cur" style={{ marginLeft: 6 }}>dias</span></p>
            <p className="sub">Deve acabar perto de <b>{dataCurta(p.acaba!)}</b>. O app avisa em {dataCurta(p.avisar!)}, 5 dias antes.</p>
            {hora && <p className="todo warn" style={{ marginTop: 12 }}>Hora de pedir o gás: faltam uns {Math.max(0, Math.round((Date.parse(p.acaba!) - Date.parse(hoje)) / 864e5))} dias.</p>}
          </>
        ) : <p className="sub">Toque em "Troquei hoje" cada vez que trocar o botijão. Com 2 trocas o app já calcula a média e avisa antes de acabar.</p>}
        <button className="btn primary" type="button" style={{ marginTop: 14 }} disabled={gas.trocas.includes(hoje)} onClick={() => setGas({ trocas: [...gasCfg.trocas, hoje] })}><Check size={20} />Troquei hoje</button>
      </section>
      <section className="card" aria-labelledby="gH">
        <div className="card-h"><h2 id="gH">Trocas anotadas</h2></div>
        <ul className="list">{[...gas.trocas].sort().reverse().map(d => <li key={d} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}><span className="m"><b>{diaSemana(d)}, {dataCurta(d)}</b></span></li>)}</ul>
        {!gas.trocas.length && <Vazio ico={<Flame size={24} />}>Nenhuma troca anotada ainda.</Vazio>}
      </section>
    </div>
  )
}

function FolhaCasa() {
  const hoje = hojeRecife()
  const mes = hoje.slice(0, 7)
  const [folha, setFolha, falhaFolha] = useConfig<Folha>('casa_folha', { pessoas: [], daePaga: {} })
  const [nova, setNova] = useState(false)
  const dae = avisoDAE(hoje, !!folha.daePaga?.[mes])
  const total = folha.pessoas.reduce((s, p) => s + reservaFolha(p.salario).total, 0)
  return (
    <div className="view">
      <FalhaConfig m={falhaFolha} />
      {folha.pessoas.length > 0 && (dae.mostrar ? (
        <section className="card" style={{ background: 'var(--warn-soft)' }} aria-label="Guia mensal do governo">
          <p className="lbl" style={{ color: 'var(--warn-ink)' }}><FuncIco id="folha" size={24} />Folha da Casa</p>
          <h2 style={{ marginTop: 6, color: 'var(--warn-ink)' }}>A guia mensal do governo vence {dataCurta(dae.vence)}</h2>
          <p className="corpo" style={{ color: 'var(--warn-ink)', marginTop: 4 }}>{dae.dias > 0 ? `Faltam ${dae.dias} dias.` : 'Vence hoje.'} É o boleto mensal do registro de quem trabalha na casa. Gere no site do governo (eSocial Doméstico, o cadastro de quem trabalha em casa), pague no app do banco e marque aqui.</p>
          <button className="btn dark" type="button" style={{ marginTop: 12 }} onClick={() => setFolha({ ...folha, daePaga: { ...folha.daePaga, [mes]: true } })}><Check size={20} />Já paguei a guia deste mês</button>
        </section>
      ) : (
        <p className="todo ok"><Check size={20} aria-hidden="true" /><span>{folha.daePaga?.[mes] ? 'Guia mensal do governo marcada como paga.' : `A guia mensal do governo vence todo dia 7. O aviso aparece do dia 1 ao dia 7.`}</span></p>
      ))}
      <section className="card" aria-labelledby="flT">
        <div className="card-h"><h2 id="flT">Quem trabalha na casa</h2></div>
        <ul className="list">
          {folha.pessoas.map(p => {
            const r = reservaFolha(p.salario)
            return (
              <li key={p.id} className="li" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                <span className="tile">{p.nome.charAt(0)}</span>
                <span className="m"><b>{p.nome}</b><small>{p.funcao} · salário {reais(p.salario)}</small></span>
                <span className="v" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span><Din v={r.total} /><small className="sub" style={{ display: 'block' }}>guardar/mês</small></span>
                  <Qm titulo={`Férias e 13º de ${p.nome}`} linhas={[{ linha: '13º: 1 salário dividido por 12', valor: r.decimo }, { linha: 'Férias: 1 salário mais 1/3, dividido por 12', valor: r.ferias }, { linha: 'Guardar por mês', valor: r.total }]} nota="Estimativa simples. Os encargos do governo (aposentadoria e fundo de garantia) já vêm na guia mensal." />
                </span>
              </li>
            )
          })}
        </ul>
        {!folha.pessoas.length && !falhaFolha && <Vazio ico={<Users size={24} />}>Ninguém cadastrado. Quem trabalha na sua casa?</Vazio>}
        {folha.pessoas.length > 0 && <p className="sub" style={{ marginTop: 8 }}>No total, guardar <b>{reais(total)}</b> por mês pra férias e 13º.</p>}
        <button className="btn line" type="button" style={{ marginTop: 12 }} onClick={() => setNova(true)}><Plus size={20} />Cadastrar pessoa</button>
      </section>
      {nova && <NovaPessoa fechar={() => setNova(false)} salvar={p => { setFolha({ ...folha, pessoas: [...folha.pessoas, p] }); setNova(false) }} />}
    </div>
  )
}

function NovaPessoa({ fechar, salvar }: { fechar: () => void; salvar: (p: PessoaFolha) => void }) {
  const [nome, setNome] = useState(''), [funcao, setFuncao] = useState(''), [sal, setSal] = useState('')
  return (
    <Sheet titulo="Quem trabalha na casa" fechar={fechar}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={e => { e.preventDefault(); if (nome && sal) salvar({ id: novoId(), nome, funcao: funcao || 'Equipe da casa', salario: textoParaValor(sal) }) }}>
        <label className="campo"><span>Nome</span><input className="inp" value={nome} onChange={e => setNome(e.target.value)} /></label>
        <label className="campo"><span>Função</span><input className="inp" placeholder="Ex.: Cozinheira, babá, motorista" value={funcao} onChange={e => setFuncao(e.target.value)} /></label>
        <label className="campo"><span>Salário na carteira</span><input className="inp" inputMode="decimal" value={sal} onChange={e => setSal(e.target.value.replace(/[^\d,]/g, ''))} /><small>Fica só com o casal. A equipe nunca vê valor de dinheiro.</small></label>
        <button className="btn primary full" type="submit">Salvar</button>
      </form>
    </Sheet>
  )
}

/** Tela da equipe da casa: lista, compras, prestadores, gás e presença. Nenhum valor em dinheiro aparece aqui.
 *  Lê e marca pelo banco (casa_da_equipe e casa_marcar), na mesma lista que o casal usa. */
function CasaEquipe() {
  const { api, familia, versao, toast, abrirLancar } = useApp()
  const [casa, setCasa] = useState<CasaDaEquipe | null>(null)
  const [erro, setErro] = useState('')
  const [novo, setNovo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => { if (familia) api.casaDaEquipe(familia.id).then(c => { setCasa(c); setErro('') }).catch(e => setErro((e as Error).message)) }, [api, familia?.id, versao])
  const hoje = casa?.hoje || hojeRecife()
  const marcar = async (tipo: MarcaCasa, dados?: { id?: string; nome?: string }, aviso?: string) => {
    if (!familia || ocupado) return
    setOcupado(true)
    try { setCasa(await api.casaMarcar(familia.id, tipo, dados)); if (aviso) toast(aviso) } catch (e) { toast((e as Error).message) } finally { setOcupado(false) }
  }
  if (!casa) return <div className="view">{erro ? <p className="erro" role="alert">{erro}</p> : <p className="sub">Abrindo a Casa...</p>}</div>
  const ponto = casa.presenca.meu_ponto
  const compradoHoje = casa.comprado.filter(c => c.data === hoje)
  const g = casa.gas
  return (
    <div className="view">
      <p className="todo"><Users size={20} aria-hidden="true" /><span>Olá, {familia?.membroNome}! Aqui você marca a lista, avisa quando chega e quando o gás é trocado. O casal vê tudo na hora.</span></p>
      <PrecisaDeVoce equipe />
      <div className="tela-larga">
        <div className="col">
          <section className="card" aria-labelledby="eHoje">
            <div className="card-h"><h2 id="eHoje"><Users size={24} aria-hidden="true" />Hoje, {diaSemana(hoje)} {dataCurta(hoje)}</h2></div>
            <div className="row-btns">
              <button className="btn primary" type="button" disabled={!!ponto.chegou || ocupado} onClick={() => marcar('cheguei', undefined, 'Chegada avisada pro casal.')}><Check size={20} />{ponto.chegou ? `Chegou ${ponto.chegou}` : 'Cheguei'}</button>
              <button className="btn line" type="button" disabled={!ponto.chegou || !!ponto.saiu || ocupado} onClick={() => marcar('sai', undefined, 'Saída avisada pro casal.')}><LogOut size={20} />{ponto.saiu ? `Saiu ${ponto.saiu}` : 'Saí'}</button>
            </div>
            <p className="lbl" style={{ marginTop: 14 }}>Comprado hoje</p>
            {compradoHoje.length ? <ul className="list">{compradoHoje.map((c, i) => <li key={i} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}><span className="m"><b>{c.nome}</b></span></li>)}</ul>
              : <Vazio ico={<ShoppingBasket size={24} />}>Nenhuma compra anotada hoje.</Vazio>}
            <button className="btn line" type="button" style={{ marginTop: 12 }} onClick={() => abrirLancar()}><Plus size={20} />Anotar compra</button>
          </section>
          <section className="card" aria-labelledby="eGas">
            <div className="card-h"><h2 id="eGas"><Flame size={24} aria-hidden="true" />Gás de cozinha</h2></div>
            {g.media_dias ? <p className="sub">Um botijão dura uns <b>{g.media_dias} dias</b>. Próxima troca perto de <b>{dataCurta(g.proxima_troca!)}</b>.</p>
              : <p className="sub">Toque em "Troquei o gás" cada vez que trocar o botijão. Com 2 trocas o app calcula a próxima.</p>}
            {g.trocas.length > 0 && <p className="sub" style={{ marginTop: 6 }}>Última troca: <b>{dataCurta(g.trocas[g.trocas.length - 1])}</b></p>}
            <button className="btn line" type="button" style={{ marginTop: 12 }} disabled={g.trocas.includes(hoje) || ocupado} onClick={() => marcar('troquei_gas', undefined, 'Troca de gás avisada pro casal.')}><Flame size={20} />{g.trocas.includes(hoje) ? 'Gás trocado hoje' : 'Troquei o gás hoje'}</button>
          </section>
          <section className="card" aria-labelledby="ePrest">
            <div className="card-h"><h2 id="ePrest"><Wrench size={24} aria-hidden="true" />Quem vem pra casa</h2></div>
            {casa.prestadores.length ? <ul className="list">{casa.prestadores.map(p => (
              <li key={p.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <span className="m"><b>{p.servico}: {p.nome}</b><small>toda {DIAS[p.dia]} · próxima {p.proxima_visita === hoje ? 'hoje' : dataCurta(p.proxima_visita)}{p.ultima_vez ? ` · veio ${p.ultima_vez === hoje ? 'hoje' : dataCurta(p.ultima_vez)}` : ''}</small></span>
                <button className="btn sm line" type="button" disabled={p.ultima_vez === hoje || ocupado} onClick={() => marcar('prestador_veio', { id: p.id }, `Avisado: ${p.nome} veio hoje.`)}><Check size={16} />{p.ultima_vez === hoje ? 'Veio' : 'Veio hoje'}</button>
              </li>
            ))}</ul> : <Vazio ico={<Wrench size={24} />}>O casal ainda não cadastrou serviços.</Vazio>}
          </section>
        </div>
        <div className="col">
          <section className="card" aria-labelledby="eLista">
            <div className="card-h"><h2 id="eLista">Lista de compras</h2><span className="chip">{casa.lista.filter(i => !i.ok).length} faltam</span></div>
            <p className="sub" style={{ marginBottom: 8 }}>A mesma lista do casal. Marque o que comprou; desmarque o que acabou.</p>
            <ul className="list">
              {casa.lista.map(i => (
                <li key={i.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                  <label className="check"><input type="checkbox" checked={i.ok} disabled={ocupado} onChange={() => marcar(i.ok ? 'acabou' : 'comprei', { id: i.id })} /><span style={{ textDecoration: i.ok ? 'line-through' : 'none', color: i.ok ? 'var(--muted)' : 'inherit' }}>{i.nome}</span></label>
                </li>
              ))}
            </ul>
            {!casa.lista.length && <Vazio ico={<ShoppingBasket size={24} />}>A lista está vazia. Acabou alguma coisa? Escreva abaixo.</Vazio>}
            <form style={{ display: 'flex', gap: 8, marginTop: 10 }} onSubmit={e => { e.preventDefault(); if (novo.trim()) { marcar('acabou', { nome: novo.trim() }, 'Item posto na lista.'); setNovo('') } }}>
              <input className="inp" placeholder="Acabou alguma coisa?" value={novo} onChange={e => setNovo(e.target.value)} aria-label="Item que acabou" />
              <button className="btn line" type="submit" aria-label="Pôr na lista"><Plus size={20} /></button>
            </form>
          </section>
        </div>
      </div>
    </div>
  )
}
