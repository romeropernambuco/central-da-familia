// E8: aba Desejos, a calculadora pra todos. "Quero R$ 50.000 pra viajar": cabe? de onde volta (contrato antecipado,
// investimento, venda)? quanto tira de 2029? Os dados vão pra tabela desejos (f_06): o casal vê todos com o nome do dono,
// a filha vê só os dela (sem 2029: só "dá pra comprar com o seu"), e só o dono mexe.
// A tela NUNCA calcula 2029: só chama cabeDesejo() (e avaliarAntecipacao(), do mesmo motor) de lib/futuro com a entrada de api/futuro.ts.
import { useEffect, useMemo, useState } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useFuturo } from '../../app/useDados2'
import { useAdultos } from '../../app/useMembros'
import { CampoValor, Din, Vazio } from '../../componentes/base'
import { mesAno } from '../../componentes/Linha2028'
import { avaliarAntecipacao, cabeDesejo, type Desejo, type FuturoEntrada } from '../../lib/futuro'
import type { DesejoTela, NovoDesejo, SituacaoDesejo, VoltaDe } from '../../api/tipos'
import { centavos, hojeRecife, mesCurto, plural, reais, textoParaValor, valorDigitadoValido } from '../../lib/formato'
import { mesMais } from '../../lib/plano'

const VOLTA: { v: VoltaDe; nome: string; ajuda: string }[] = [
  { v: 'nada', nome: 'Não volta', ajuda: 'O dinheiro sai e pronto (viagem, presente, reforma).' },
  { v: 'contrato', nome: 'Contrato adiantado', ajuda: 'Pagar com um contrato que você recebe adiantado, com desconto.' },
  { v: 'investimento', nome: 'Investimento', ajuda: 'Sai agora e volta depois, com rendimento.' },
  { v: 'venda', nome: 'Venda', ajuda: 'Volta quando vender alguma coisa (o carro velho, por exemplo).' },
]
const SITUACAO: { v: SituacaoDesejo; nome: string }[] = [
  { v: 'pensando', nome: 'Pensando' }, { v: 'combinado', nome: 'Combinado' }, { v: 'feito', nome: 'Feito' }, { v: 'desisti', nome: 'Desisti' },
]

/** Os meses que dá pra escolher: deste mês até 36 meses pra frente. */
const mesesDaqui = (hoje = hojeRecife()) => Array.from({ length: 37 }, (_, i) => mesMais(hoje.slice(0, 7), i))
const r$ = (c: number) => reais(Math.abs(c) / 100)

/** O desejo no formato do motor (centavos, 'AAAA-MM'). Sem conta: só troca de formato. */
export function desejoDoMotor(d: NovoDesejo, id = 'novo', dono = ''): Desejo {
  const nada = d.volta_de === 'nada'
  return {
    id, dono, valor: Math.round(d.valor * 100), mes: d.mes, volta_de: d.volta_de,
    volta: nada ? 0 : Math.round(d.volta * 100), volta_mes: nada ? null : d.volta_mes,
    antecipado: d.volta_de === 'contrato' && d.antecipado != null ? Math.round(d.antecipado * 100) : null,
    volta_certa: d.volta_de === 'contrato' ? true : !nada && d.volta_certa,
  }
}

/** As frases do "cabe?" a partir do que o motor devolveu (até 3 frases curtas, nunca sinal de menos nem vermelho). */
export function frasesDesejo(c: ReturnType<typeof cabeDesejo>, d: Desejo, antecipa?: ReturnType<typeof avaliarAntecipacao> | null): { titulo: string; ok: boolean; linhas: string[] } {
  const linhas: string[] = []
  let titulo: string, ok: boolean
  // modo renda (depois da virada, QA E11): sem linha até 2028; compara o dinheiro guardado de hoje com o piso
  const renda = c.modo === 'renda'
  const de = renda ? 'da renda' : 'da renda de 2029'
  if (c.situacao === 'cabe') { titulo = 'Cabe.'; ok = true; linhas.push(renda ? 'O dinheiro guardado continua acima do piso e a renda cobre o mês.' : 'Nenhum mês até 12/2028 fica abaixo do piso e 2029 continua coberto.') }
  else if (c.situacao === 'cabe, mas tira') { titulo = renda ? 'Cabe, mas tira da renda.' : 'Cabe, mas tira de 2029.'; ok = false; linhas.push(renda ? 'O dinheiro guardado continua acima do piso, mas a renda passa a não cobrir o mês.' : 'Nenhum mês fica abaixo do piso, mas a conta de 2029 fica mais curta.') }
  else if (c.situacao === 'ainda nao cabe') {
    titulo = 'Ainda não cabe.'; ok = false
    if (renda) linhas.push('Com ele, o dinheiro guardado fica abaixo do piso.')
    else { linhas.push(`Em ${mesAno(c.primeiro_mes_abaixo!)} o caixa fica abaixo do piso.`, c.caberia_em ? `Cabe a partir de ${mesAno(c.caberia_em)}.` : 'Até 12/2028 não cabe: só com mais dinheiro entrando.'); if (c.apertado_sem_desejo) linhas.push(`Mesmo sem este desejo, em ${mesAno(c.apertado_sem_desejo)} o caixa já fica abaixo do piso.`) }
  }
  else { titulo = 'O caixa já está apertado.'; ok = false; linhas.push(renda ? 'Mesmo sem este desejo, o dinheiro guardado já está abaixo do piso.' : `Mesmo sem este desejo, em ${mesAno(c.apertado_sem_desejo!)} o caixa fica abaixo do piso.`) }
  const t = c.tira_por_mes_2029
  linhas.push(t === null ? 'Nesse cenário o rendimento não repõe a inflação.' : t > 0 ? `Tira ${r$(t)} por mês ${de}, pra sempre.` : t < 0 ? `Volta mais do que sai: soma ${r$(t)} por mês na ${de.slice(3)}.` : `Não muda a ${de.slice(3)}.`)
  if (d.volta_de !== 'nada' && d.volta_de !== 'contrato' && !d.volta_certa) linhas.push('A volta é incerta: fica fora da conta, só entra se vier.')
  // M3: a antecipação mostra quanto se perde (valor em 2029 e por mês, do motor), nunca com sinal
  if (antecipa) {
    const pm = antecipa.impacto_renda_mensal
    linhas.push(antecipa.leitura === 'antecipar custa mais do que o caixa rende'
      ? `Adiantar o contrato custa mais do que o caixa rende: perde ${r$(antecipa.efeito_na_virada)} até 2029${pm ? ` e tira ${r$(pm)} por mês da renda de 2029` : ''}.`
      : `Adiantar o contrato compensa: o desconto é menor do que o caixa rende${pm ? ` e soma ${r$(pm)} por mês na renda de 2029` : ''}.`)
  }
  return { titulo, ok, linhas }
}

/** O motor responde "cabe?" pra 1 desejo. `semEste`: tira o próprio desejo da entrada (ele já está na lista da família). */
function avaliar(entrada: FuturoEntrada, d: Desejo, semEste = false) {
  const e = semEste ? { ...entrada, desejos: entrada.desejos.filter(x => x.id !== d.id) } : entrada
  try {
    const c = cabeDesejo(e, d)
    const p = entrada.parametros
    const antecipa = d.volta_de === 'contrato' && d.antecipado != null && d.volta_mes
      ? avaliarAntecipacao(d.antecipado, d.mes, d.volta, d.volta_mes, { taxa_bruta_ano: p.taxa_bruta_ano, aliq_proj: p.aliq_proj, virada: p.virada, taxa_real_trabalho: p.taxa_real_trabalho })
      : null
    return frasesDesejo(c, d, antecipa)
  } catch { return null }
}

/** Filha: sem 2029. Só "dá pra comprar com o seu": neste mês, o que sobra; num mês que vem, o limite dela daquele mês. */
export function fraseDaFilha(valor: number, livre: number, limite: number, mesQueVem = false): string {
  if (!mesQueVem && valor <= Math.max(0, livre) + 0.005) return `Dá pra comprar com o seu: sobram ${reais(centavos(livre - valor))} no seu mês.`
  if (mesQueVem && valor <= limite + 0.005) return `Dá pra comprar com o seu: cabe no seu limite daquele mês (${reais(limite)}), se você guardar o limite daquele mês pra isso.`
  if (limite <= 0) return 'Passa do que sobra no seu mês. Converse com os pais.'
  const n = Math.ceil(valor / limite)
  return `Passa do ${mesQueVem ? 'seu limite do mês' : `que sobra no seu mês (${reais(Math.max(0, livre))})`}. Com o seu limite de ${reais(limite)}, são ${plural(n, 'mês', 'meses')} juntando tudo. Converse com os pais.`
}

const VAZIO = { nome: '', valor: '', mes: '', volta_de: 'nada' as VoltaDe, volta: '', volta_mes: '', antecipado: '', volta_certa: true }

export function Desejos() {
  const { api, familia, resumo, versao, tentar, toast } = useApp()
  const { ent, saida: saidaF, estado: estFuturo, motivo: motivoFuturo } = useFuturo()
  const casal = familia?.papel === 'casal'
  const adultos = useAdultos()
  const [lista, setLista] = useState<DesejoTela[] | null>(null)
  const [n, setN] = useState(0)
  const [f, setF] = useState(VAZIO)
  const [gravando, setGravando] = useState(false)
  const meses = useMemo(() => mesesDaqui(), [])
  useEffect(() => {
    if (!familia || !api.desejos) return
    api.desejos(familia.id).then(setLista).catch(() => setLista([]))
  }, [api, familia?.id, versao, n])

  // calculado antes dos retornos: os ganchos (useMemo, useEffect) abaixo precisam rodar sempre na mesma ordem
  const mes = f.mes || meses[1]
  const voltaMes = f.volta_mes || mesMais(mes, 12)
  const novo: NovoDesejo = { nome: f.nome.trim(), valor: textoParaValor(f.valor), mes, volta_de: f.volta_de, volta: textoParaValor(f.volta), volta_mes: f.volta_de === 'nada' ? null : voltaMes, antecipado: f.volta_de === 'contrato' ? textoParaValor(f.antecipado) : null, volta_certa: f.volta_de === 'contrato' || f.volta_certa }
  // pra quem pega um contrato adiantado, o que entra agora é o "antecipado"; o que receberia depois é a "volta"
  const falta = !novo.nome ? 'Diga o que é.' : !(novo.valor > 0) || !valorDigitadoValido(f.valor) ? 'Digite quanto custa.'
    : novo.volta_de !== 'nada' && !(novo.volta > 0) ? (novo.volta_de === 'contrato' ? 'Digite quanto receberia no contrato.' : 'Digite quanto volta.')
    : novo.volta_de === 'contrato' && !(novo.antecipado! > 0) ? 'Digite quanto recebe adiantado.'
    : novo.volta_de !== 'nada' && novo.volta_mes! < novo.mes ? 'O mês em que volta tem que ser depois do mês do desejo.' : ''
  // M2 (revisão E4 a E10): o "cabe?" é pesado (até ~27 rodadas do motor). O formulário só recalcula 300 ms depois da
  // última tecla, e a lista guarda o resultado de cada desejo até a lista ou os dados de 2029 mudarem.
  const chaveNovo = casal && !falta && novo.valor > 0 ? JSON.stringify(novo) : ''
  const [chaveFeita, setChaveFeita] = useState('')
  useEffect(() => { const t = setTimeout(() => setChaveFeita(chaveNovo), 300); return () => clearTimeout(t) }, [chaveNovo])
  const resultado = useMemo(() => (chaveFeita && ent?.entrada ? avaliar(ent.entrada, desejoDoMotor(JSON.parse(chaveFeita) as NovoDesejo)) : null), [chaveFeita, ent])
  const resultadoPronto = !!chaveNovo && chaveFeita === chaveNovo
  // tempo limite: se em 5 s a conta não saiu, a tela diz (nunca fica parada em "Fazendo a conta…")
  const [demorou, setDemorou] = useState(false)
  useEffect(() => { setDemorou(false); if (!chaveNovo) return; const t = setTimeout(() => setDemorou(true), 5000); return () => clearTimeout(t) }, [chaveNovo])
  // sem dados pra conta (banco sem a função, ou o motor não conseguiu): a mensagem no lugar do "Fazendo a conta…"
  const semConta = estFuturo === 'erro' ? `Não deu pra buscar os números de 2029: ${motivoFuturo}`
    : ent && !ent.entrada ? ent.motivo || 'Faltam números pra conta: confira o Objetivo de 2029 no Planejamento.'
    : resultadoPronto && !resultado && ent?.entrada ? 'Não deu pra fazer a conta com esses números. Confira o valor e os meses.' : ''
  const daLista = useMemo(() => {
    const m = new Map<string, ReturnType<typeof avaliar>>()
    if (casal && ent?.entrada) for (const d of lista || []) if (d.situacao !== 'feito' && d.situacao !== 'desisti') m.set(d.id, avaliar(ent.entrada, desejoDoMotor(d, d.id, d.dono_membro), true))
    return m
  }, [casal, ent, lista])

  if (!familia || familia.papel === 'equipe') return null
  if (!api.desejos) return <div className="card"><Vazio ico={<Sparkles size={24} />}>Os desejos ainda estão sendo ligados no banco da família.</Vazio></div>

  const meuEnv = resumo?.envelopes.find(e => e.id === familia.envelopeId)

  // o resultado: casal, do motor (cabeDesejo); filha, só o mês dela. QA E11 (E1): nunca fica parado em "Fazendo a conta…"
  const resposta = falta || !(novo.valor > 0) ? null : casal
    ? resultado && resultadoPronto ? <div className={'todo ' + (resultado.ok ? 'ok' : 'warn') + ' desejo-res'} role="status"><span><b>{resultado.titulo}</b> {resultado.linhas.join(' ')}</span></div>
      : semConta ? <p className="todo warn desejo-res" role="status"><span>{semConta}</span></p>
      : <p className="sub desejo-res">{demorou ? 'A conta está demorando. Espere um pouco ou mude um número pra tentar de novo.' : 'Fazendo a conta…'}</p>
    : meuEnv ? <p className={'todo ' + (/^Dá pra/.test(fraseDaFilha(novo.valor, meuEnv.livre, meuEnv.limite_base ?? meuEnv.limite_mes, novo.mes > hojeRecife().slice(0, 7))) ? 'ok' : 'warn') + ' desejo-res'} role="status"><span>{fraseDaFilha(novo.valor, meuEnv.livre, meuEnv.limite_base ?? meuEnv.limite_mes, novo.mes > hojeRecife().slice(0, 7))}</span></p> : null

  async function guardar() {
    if (!familia || falta || gravando) return
    setGravando(true)
    const ok = await tentar(() => api.desejoCriar!(familia.id, novo))
    setGravando(false)
    if (ok) { setF(VAZIO); setN(x => x + 1); toast(`${novo.nome} guardado nos desejos.${casal && adultos !== 1 ? ' A outra pessoa do casal vê, com o seu nome.' : ''}`) }
  }
  async function mudar(d: DesejoTela, m: { situacao?: SituacaoDesejo; apagar?: boolean }) {
    if (!familia) return
    if (await tentar(() => api.desejoMudar!(familia.id, d.id, m))) { setN(x => x + 1); toast(m.apagar ? `${d.nome} saiu da lista.` : `${d.nome}: ${SITUACAO.find(s => s.v === m.situacao)?.nome.toLowerCase()}.`) }
  }
  const campo = (k: keyof typeof VAZIO) => (v: string) => setF({ ...f, [k]: v })

  return (
    <div className="tela-larga">
      <div className="col">
        <section className="card" aria-labelledby="dCalc">
          <div className="card-h"><h2 id="dCalc"><Sparkles size={24} aria-hidden="true" />Quero…</h2></div>
          <p className="sub" style={{ marginBottom: 10 }}>{casal ? (saidaF?.modo === 'renda' ? 'Escreva o que quer e quando. O app diz se cabe no dinheiro guardado e quanto tira da renda.' : 'Escreva o que quer e quando. O app diz se cabe no caixa até 2028 e quanto tira da renda de 2029.') : 'Escreva o que quer e quanto custa. O app diz se dá pra comprar com o seu.'}</p>
          <div className="desejo-form">
          <label className="campo"><span>O que é</span><input className="inp" maxLength={80} placeholder={casal ? 'Ex.: viagem de férias' : 'Ex.: bicicleta'} value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} /></label>
          <div className="campo"><span>Quanto custa</span><CampoValor valor={f.valor} mudar={campo('valor')} rotulo="Quanto custa" /></div>
          <label className="campo"><span>Quando</span>
            <select className="inp" value={mes} onChange={e => setF({ ...f, mes: e.target.value })}>{meses.map(m => <option key={m} value={m}>{mesCurto(m + '-01')}</option>)}</select>
          </label>
          {/* QA E11 (E9): a resposta vem logo depois de "Quando", antes da pergunta da volta (a 130% fica acima da dobra) */}
          {resposta}
          {casal && <>
            <div className="campo"><span id="dVolta">O dinheiro volta?</span>
              <div className="pills" role="group" aria-labelledby="dVolta">{VOLTA.map(v => <button key={v.v} type="button" className="pill" aria-pressed={f.volta_de === v.v} onClick={() => setF({ ...f, volta_de: v.v })}>{v.nome}</button>)}</div>
              <small>{VOLTA.find(v => v.v === f.volta_de)!.ajuda}</small>
            </div>
            {f.volta_de === 'contrato' && <div className="campo"><span>Quanto recebe adiantado</span><CampoValor valor={f.antecipado} mudar={campo('antecipado')} rotulo="Quanto recebe adiantado" /></div>}
            {f.volta_de !== 'nada' && <>
              <div className="campo"><span>{f.volta_de === 'contrato' ? 'Quanto receberia no contrato' : 'Quanto volta'}</span><CampoValor valor={f.volta} mudar={campo('volta')} rotulo={f.volta_de === 'contrato' ? 'Quanto receberia no contrato' : 'Quanto volta'} /></div>
              <label className="campo"><span>{f.volta_de === 'contrato' ? 'Quando receberia' : 'Quando volta'}</span>
                <select className="inp" value={voltaMes} onChange={e => setF({ ...f, volta_mes: e.target.value })}>{meses.filter(m => m >= mes).map(m => <option key={m} value={m}>{mesCurto(m + '-01')}</option>)}</select>
              </label>
              {f.volta_de !== 'contrato' && <div className="campo"><span id="dCerto">É certo?</span>
                <div className="pills" role="group" aria-labelledby="dCerto">
                  <button type="button" className="pill" aria-pressed={f.volta_certa} onClick={() => setF({ ...f, volta_certa: true })}>Certo (tem contrato ou data)</button>
                  <button type="button" className="pill" aria-pressed={!f.volta_certa} onClick={() => setF({ ...f, volta_certa: false })}>Incerto</button>
                </div>
              </div>}
            </>}
          </>}
          </div>

          {falta && (f.nome || f.valor) ? <p className="sub" style={{ marginTop: 8 }}>{falta}</p> : null}
          <button className="btn primary" type="button" disabled={!!falta || gravando} onClick={guardar} style={{ marginTop: 12 }}><Plus size={20} />Guardar na lista</button>
        </section>
      </div>
      <div className="col">
        <section className="card" aria-labelledby="dLista">
          <div className="card-h"><h2 id="dLista">{casal ? 'Desejos da família' : 'Seus desejos'}</h2></div>
          {lista === null ? <p className="sub">Buscando…</p> : !lista.length ? <Vazio ico={<Sparkles size={24} />}>Nenhum desejo ainda. Escreva o 1º aqui do lado.</Vazio> : (
            <ul className="list">
              {lista.map(d => {
                const m = desejoDoMotor(d, d.id, d.dono_membro)
                const r = daLista.get(d.id) ?? null
                const dono = d.meu ? 'seu' : `de ${d.dono_nome || 'outra pessoa'}`
                const volta = d.volta_de === 'nada' ? '' : d.volta_de === 'contrato' ? ` · contrato adiantado: entra ${reais(d.antecipado || 0)} no lugar de ${reais(d.volta)} em ${mesCurto((d.volta_mes || d.mes) + '-01')}` : ` · volta ${reais(d.volta)} em ${mesCurto((d.volta_mes || d.mes) + '-01')}${d.volta_certa ? '' : ', se vier'}`
                return (
                  <li key={d.id} className="li desejo" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} {...(d.meu ? {} : { 'data-do-outro': d.dono_nome || 'outra pessoa' })}>
                    <span className="m"><b className="quebra">{d.nome}</b>
                      <small>{casal ? `${dono} · ` : ''}{mesCurto(d.mes + '-01')}{volta} · {SITUACAO.find(s => s.v === d.situacao)?.nome.toLowerCase()}</small>
                      {r && <small className={'desejo-cabe ' + (r.ok ? 'ok' : 'warn')}><b>{r.titulo}</b> {[...(r.ok ? [] : r.linhas.filter(x => !x.startsWith('Nenhum') && !x.startsWith('O dinheiro guardado continua') && /piso|Cabe a partir|não cabe/.test(x))), ...r.linhas.filter(x => /por mês (da|na) renda|muda a renda|não repõe/.test(x) && !/^Adiantar/.test(x)), ...r.linhas.filter(x => /^Adiantar/.test(x))].join(' ')}</small>}
                      {!casal && meuEnv && d.situacao === 'pensando' && <small>{fraseDaFilha(d.valor, meuEnv.livre, meuEnv.limite_base ?? meuEnv.limite_mes, d.mes > hojeRecife().slice(0, 7))}</small>}
                      {d.meu ? (
                        <span className="pills desejo-sit" role="group" aria-label={`Como está: ${d.nome}`}>
                          {SITUACAO.map(s => <button key={s.v} type="button" className="pill" aria-pressed={d.situacao === s.v} onClick={() => d.situacao !== s.v && mudar(d, { situacao: s.v })}>{s.nome}</button>)}
                          <button type="button" className="pill" onClick={() => mudar(d, { apagar: true })}>Tirar da lista</button>
                        </span>
                      ) : <small className="dono-linha">Só {d.dono_nome || 'quem anotou'} muda este desejo.</small>}
                    </span>
                    <span className="v"><Din v={d.valor} /></span>
                  </li>
                )
              })}
            </ul>
          )}
          {casal && <p className="sub" style={{ marginTop: 8 }}>Pensando e combinado entram na conta de 2029. Feito já saiu do dinheiro guardado e desisti não sai: os 2 ficam fora da conta.</p>}
        </section>
      </div>
    </div>
  )
}
