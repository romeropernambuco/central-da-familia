import { textoPrivado, CampoPrivado } from '../../componentes/privacidade'
// E5 (fase final): recebimentos com data, um bloco dentro do Planejamento (sem tela nova).
// Regra do dono (13/11): até dez/2028 entram recebimentos com data que o dono marca como certos; o plano conta só esses.
// Casal LÊ todos, com o nome do dono; só o dono lança e mexe. Atrasado nunca some: vai pro mês seguinte e vira pergunta ao
// dono (regra F4 do ECONOMISTA, que mora em lib/futuro: a tela só chama mesDoRecebimento e não faz conta de 2029).
import { useRef, useState } from 'react'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { invalidarDados } from '../../app/invalidacao'
import { ErroRede } from '../../api/erros'
import { novoUuid } from '../../lib/seguro'
import { CalendarClock, Check, Plus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import type { FonteReceita, NovoRecebimento, RecebimentoTela, TipoRecebimento } from '../../api/tipos'
import { mesReceitaValido, mesesDaReceita } from '../../api/futuro'
import { useFontesReceita } from '../../app/useFontesReceita'
import { CamposFonteReceita, ConfirmarReceita, ORIGENS_RECEITA, CERTEZAS_RECEITA, fonteInicial } from '../../componentes/FontesReceita'
import { CenariosReceitas } from '../../componentes/CenariosReceitas'
import { mesDoRecebimento } from '../../lib/futuro'
import { dataCurta, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido } from '../../lib/formato'

/** Último mês antes da virada (premissa do TIME.md: a família vive de rendimento a partir de jan/2029). */
const ULTIMO = '2028-12'
const TIPO: Record<TipoRecebimento, string> = { salario: 'salário', contrato: 'contrato', retorno: 'retorno de investimento', outro: 'outro' }
const proximo = (m: string) => { const [a, x] = m.split('-').map(Number); return x === 12 ? `${a + 1}-01` : `${a}-${String(x + 1).padStart(2, '0')}` }

/** Em que mês o recebimento conta e se o dono precisa responder (a regra F4, do motor). */
export function situacaoRecebimento(r: RecebimentoTela, hoje = hojeRecife()) {
  const x = mesDoRecebimento({ id: r.id, dono: r.dono_nome || '', valor: Math.round(r.valor * 100), mes_previsto: r.mes_previsto, mes_novo: r.mes_novo, certo: r.certo, recebido: !!r.recebido_em }, hoje.slice(0, 7), ULTIMO)
  return { conta_em: x.mes, pergunta: x.pergunta, atrasado: !r.recebido_em && r.mes_previsto < hoje.slice(0, 7) }
}

function MudarReceb({ r, fonte: inicial, pronto, fechar, mexer, salvarFonte }: { r: RecebimentoTela; fonte?: FonteReceita; pronto: boolean; fechar: () => void; mexer: (m: { mes_novo?: string | null; certo?: boolean; apagar?: boolean }, aviso: string) => void; salvarFonte: (f: FonteReceita, valor: number) => Promise<boolean> }) {
  const hoje = hojeRecife().slice(0, 7)
  const min = [proximo(r.mes_previsto), proximo(hoje)].sort()[1]
  const [mes, setMes] = useState(r.mes_novo || min)
  const [certeza, setCerteza] = useState(false)
  const [fonte, setFonte] = useState(inicial || fonteInicial(r.certo))
  const [valor, setValor] = useState(String(r.valor).replace('.', ','))
  const [erro, setErro] = useState(''), [ocupado, setOcupado] = useState(false)
  const trava = useRef(false)
  return <Sheet titulo={textoPrivado(r.descricao)} fechar={() => { if (!ocupado) fechar() }}>
    <p className="sub">Previsto pra {textoPrivado(mesCurto(r.mes_previsto))}, <Din v={r.valor} />.</p>
    <form style={{ display: 'grid', gap: 12 }} onSubmit={async e => {
      e.preventDefault(); if (trava.current || !pronto) return
      if (!valorDigitadoValido(valor) || textoParaValor(valor) <= 0) { setErro('Confira o valor de cada recebimento.'); return }
      if (fonte.fim && (!mesReceitaValido(fonte.fim) || fonte.fim < r.mes_previsto || fonte.fim > '2031-12')) { setErro('O fim deve ser entre o primeiro mês e dezembro de 2031.'); return }
      trava.current = true; setOcupado(true)
      try { if (await salvarFonte(fonte, textoParaValor(valor))) fechar(); else setErro('Não foi possível terminar de salvar. Confira e tente novamente; seus campos continuam aqui.') }
      catch { setErro('Não foi possível terminar de salvar. Seus campos continuam aqui.') }
      finally { trava.current = false; setOcupado(false) }
    }}>
      <CamposFonteReceita fonte={fonte} mudar={setFonte} inicio={r.mes_previsto} />
      <div className="campo"><span>Valor de cada recebimento</span><CampoValor valor={valor} mudar={setValor} rotulo="Valor de cada recebimento" /><small>Muda as ocorrências ainda não recebidas. Valores já conferidos são preservados.</small></div>
      {erro && <p role="alert">{erro}</p>}
      <button className="btn primary full" type="submit" disabled={ocupado || !pronto}>Salvar fonte e valor</button>
    </form>
    <label className="campo"><span>Vai chegar em</span><CampoPrivado className="inp" type="month" value={mes} min={min} onChange={e => setMes(e.target.value)} /><small>O mês novo tem que ser depois do previsto. Em uma série, muda só a primeira ocorrência.</small></label>
    <button className="btn line full" type="button" disabled={ocupado || !mesReceitaValido(mes) || mes <= r.mes_previsto} onClick={() => mexer({ mes_novo: mes }, `${r.descricao}: agora entra em ${mesCurto(mes)}.`)}>Mudar pra {mesReceitaValido(mes) ? textoPrivado(mesCurto(mes)) : 'o mês novo'}</button>
    <button className="btn ghost full" type="button" disabled={ocupado} onClick={() => { if (!certeza) { setCerteza(true); return } mexer({ apagar: true }, `${r.descricao} saiu da lista. Nada é apagado de vez.`) }}>{certeza ? 'Toque de novo pra tirar' : 'Não vai mais entrar: tirar da lista'}</button>
  </Sheet>
}

export function Recebimentos() {
  const { api, familia } = useApp()
  if (!api.recebimentos || familia?.papel !== 'casal') return null
  return <RecebimentosCasal key={`${api.modo}:${familia.id}`} />
}

function RecebimentosCasal() {
  const { api, familia, versao, tentar, toast, recarregar } = useApp()
  const fontes = useFontesReceita()
  const [n, setN] = useState(0)
  const [novo, setNovo] = useState(false)
  const [mudar, setMudar] = useState<RecebimentoTela | null>(null)
  const [conferir, setConferir] = useState<RecebimentoTela | null>(null)
  const criacoes = useRef(new Map<string, { antes: Set<string>; gravou: boolean; id?: string }>())
  const { dado: lista, erro: falha, carregando, repetir } = useLeituraRemota(`${familia?.id}:${familia?.papel}`, familia && api.recebimentos ? () => api.recebimentos!(familia.id) : null, [api, versao, n])
  if (!api.recebimentos || familia?.papel !== 'casal') return null
  const hoje = hojeRecife()
  const pendentes = (r: RecebimentoTela) => mesesDaReceita(r.mes_previsto, fontes.fontes[r.id]).filter((m, i) => !(i === 0 && r.recebido_em) && !fontes.controle[r.id]?.recebidas?.[m])
  const valorAtual = (r: RecebimentoTela) => ({ ...r, valor: (fontes.controle[r.id]?.valor ?? Math.round(r.valor * 100)) / 100 })
  const salvarNovo = async (r: NovoRecebimento & { chave: string }, fonte: FonteReceita | null) => {
    // Sem escolha nova mantém a compatibilidade do formulário antigo (uma vez, campo certo).
    if (!fonte) { await api.recebimentoCriar!(familia.id, r); return }
    if (!fontes.pronto) throw new Error('Aguarde o cadastro de fontes carregar. Nada foi enviado.')
    let op = criacoes.current.get(r.chave)
    if (!op) { op = { antes: new Set((await api.recebimentos!(familia.id)).map(x => x.id)), gravou: false }; criacoes.current.set(r.chave, op) }
    const concluir = async () => {
      const candidatos = (await api.recebimentos!(familia.id)).filter(x => !op!.antes.has(x.id) && x.meu && x.descricao === r.descricao && x.valor === r.valor && x.mes_previsto === r.mes_previsto)
      if (!op!.id && candidatos.length === 1) op!.id = candidatos[0].id
      if (!op!.id) throw new Error('O recebimento foi enviado, mas ainda não deu para identificar sua fonte. Tente Anotar novamente para conferir, sem criar outro.')
      if (!await fontes.salvarFonte(op!.id, fonte)) throw new Error('Recebimento salvo; falta guardar a fonte. Tente Anotar novamente, sem criar outro.')
      if (!await fontes.salvarControle(op!.id, { ...fontes.controle[op!.id], atualizado_em: hoje })) throw new Error('Recebimento e fonte salvos; falta guardar a data de atualização. Tente Anotar novamente, sem criar outro.')
    }
    if (!op.gravou) {
      try { await api.recebimentoCriar!(familia.id, r); op.gravou = true }
      catch (e) {
        const rede = e as ErroRede & { conferir?: () => Promise<boolean> }
        if (e instanceof ErroRede && rede.conferir) {
          const checar = rede.conferir
          rede.conferir = async () => { if (!await checar()) return false; op!.gravou = true; await concluir(); return true }
        }
        throw e
      }
    }
    await concluir()
  }
  const confirmar = async (r: RecebimentoTela, mes: string, valor: number, data: string) => {
    if (!r.meu || !pendentes(r).includes(mes)) return false
    const serie = fontes.fontes[r.id]?.recorrencia && fontes.fontes[r.id].recorrencia !== 'unica'
    const anterior = fontes.controle[r.id] || {}
    const ok = serie ? await fontes.salvarControle(r.id, { ...anterior, recebidas: { ...anterior.recebidas, [mes]: { valor: Math.round(valor * 100), data } } })
      : await tentar(() => api.recebimentoMudar!(familia.id, r.id, { recebido_em: data, valor_recebido: valor }))
    if (!ok) return false
    invalidarDados(api, familia.id); setN(x => x + 1)
    let usado = false
    toast(`Recebimento conferido: ${r.descricao}.`, async () => {
      if (usado) return; usado = true
      // Relê o controle para preservar confirmações feitas depois, inclusive em outro aparelho.
      const desfeito = serie ? await tentar(async () => {
        const remoto = await api.config<typeof fontes.controle>(familia.id, 'receitas_controle', {})
        const atual = remoto[r.id], recebidas = { ...atual?.recebidas }
        if (recebidas[mes]?.data !== data || recebidas[mes]?.valor !== Math.round(valor * 100)) throw new Error('Essa ocorrência mudou em outro aparelho. Confira antes de desfazer.')
        delete recebidas[mes]
        if (!await fontes.salvarControle(r.id, { ...atual, recebidas })) throw new Error('Não deu para desfazer. Tente novamente.')
      }) : await tentar(() => api.recebimentoMudar!(familia.id, r.id, { recebido_em: r.recebido_em, valor_recebido: r.valor_recebido }))
      if (!desfeito) usado = false
      invalidarDados(api, familia.id); setN(x => x + 1)
    })
    return true
  }
  const mexer = (id: string, m: Parameters<NonNullable<typeof api.recebimentoMudar>>[2], aviso: string) =>
    tentar(async () => { await api.recebimentoMudar!(familia.id, id, m); invalidarDados(api, familia.id); setN(x => x + 1); toast(aviso) })
  const abertos = (lista || []).filter(r => pendentes(r).length > 0 || !!fontes.fontes[r.id]).map(valorAtual)
  const chegaram = (lista || []).filter(r => r.recebido_em && r.recebido_em.slice(0, 7) >= hoje.slice(0, 7))
  return (
    <section className="card" aria-labelledby="pRec">
      <div className="card-h"><h2 id="pRec"><CalendarClock size={24} aria-hidden="true" />Recebimentos com data</h2><button className="lnk" type="button" onClick={() => setNovo(true)}><Plus size={16} />Recebimento</button></div>
      <p className="sub" style={{ marginBottom: 8 }}>Receitas da família, inclusive empresas e novos negócios. Só Garantido entra no número oficial de 2029. Só o dono lança e muda.</p>
      {api.modo === 'exemplo' && <p className="sub">Exemplo: receitas e valores inventados. Nenhuma alteração vai para a família real.</p>}
      {fontes.erro && <p role="alert">Não deu para abrir o cadastro de fontes. {textoPrivado(fontes.erro)} <button type="button" onClick={() => recarregar()}>Conferir novamente</button></p>}
      {fontes.pronto && <CenariosReceitas fontes={fontes.fontes} controle={fontes.controle} revisao={n} />}
      {!falha && !carregando && lista && fontes.pronto && !lista.some(r => ['empresa', 'negocio_novo'].includes(fontes.fontes[r.id]?.origem)) && <p>Tem uma empresa ou negócio novo que vai gerar receita? <button type="button" className="lnk" onClick={() => setNovo(true)}>Cadastre aqui</button></p>}
      {!falha && !carregando && lista && !lista.length && <Vazio ico={<CalendarClock size={24} />} acao={<button className="btn line" type="button" onClick={() => setNovo(true)}><Plus size={20} />Anotar recebimento</button>}>Nenhum recebimento anotado. Ex.: contrato que paga em março, venda do carro.</Vazio>}
      {carregando && <p role="status">Buscando recebimentos…</p>}
      {falha && <p role="alert">Não deu pra buscar recebimentos. {lista && 'Dados desatualizados.'} <button type="button" onClick={repetir}>Tentar novamente</button></p>}
      <ul className="list">
        {abertos.map(r => {
          const f = fontes.fontes[r.id], meses = pendentes(r)
          const previsto = meses[0] || r.mes_previsto, certo = f ? f.certeza === 'garantido' : r.certo
          const mesNovo = previsto === r.mes_previsto ? r.mes_novo : null
          const s = situacaoRecebimento({ ...r, mes_previsto: previsto, mes_novo: mesNovo, recebido_em: null, certo }, hoje)
          return (
            <li key={r.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }} {...(r.meu ? {} : { 'data-do-outro': textoPrivado(r.dono_nome || 'outra pessoa') })}>
              <span className="m"><b>{textoPrivado(r.descricao)}</b>
                <small>{textoPrivado(r.meu ? 'seu' : `de ${r.dono_nome || 'outra pessoa'}`)} · {f ? ORIGENS_RECEITA[f.origem] : TIPO[r.tipo]} · {f ? CERTEZAS_RECEITA[f.certeza] : r.certo ? 'certo' : 'ainda incerto: fora da conta'}</small>
                {f && <small>{textoPrivado(`${f.rotulo || ORIGENS_RECEITA[f.origem]} · ${f.recorrencia === 'mensal' ? 'Todo mês' : f.recorrencia === 'anual' ? 'Todo ano' : 'Só uma vez'}${f.recorrencia !== 'unica' ? `, até ${mesCurto(f.fim || '2031-12')}` : ''}`)}</small>}
                <small>Fonte: anotado pelo dono · {fontes.controle[r.id]?.atualizado_em ? `Última atualização em ${textoPrivado(fontes.controle[r.id].atualizado_em)}. Confira se o valor ainda vale.` : 'Data de atualização não informada: confira se o valor ainda vale.'}</small>
                {!!fontes.controle[r.id]?.recebidas && <small>{textoPrivado(Object.entries(fontes.controle[r.id].recebidas!).map(([m, x]) => `${mesCurto(m)}: chegou ${reais(x.valor / 100)} em ${dataCurta(x.data)}`).join('; '))}</small>}
                {r.recebido_em && <small>{textoPrivado(`Primeiro recebimento conferido: ${reais(r.valor_recebido ?? r.valor)}, em ${dataCurta(r.recebido_em)}.`)}</small>}
                <small>{!meses.length ? 'Nenhuma ocorrência pendente no prazo informado.' : textoPrivado(s.conta_em ? `Entra em ${mesCurto(s.conta_em)}${mesNovo ? ` (era ${mesCurto(previsto)})` : ''}` : certo ? 'Depois de dezembro de 2028' : `Previsto pra ${mesCurto(previsto)}`)}</small>
                {/* atrasado: nunca some; o dono responde quando chega */}
                {!!meses.length && s.atrasado && certo && <span className="sub" style={{ marginTop: 6 }}>{textoPrivado(`Era pra ${mesCurto(previsto)} e ainda não chegou. Na conta, foi pra ${mesCurto(s.conta_em || proximo(hoje.slice(0, 7)))}.${s.pergunta ? ' Você pode conferir quando chegar.' : ''}`)}</span>}
                {r.meu && <span className="row-btns" style={{ marginTop: 8 }}>
                  {!!meses.length && <button className="btn sm line" type="button" disabled={!fontes.pronto} onClick={() => { invalidarDados(api, familia.id); setConferir(r) }}><Check size={16} />Chegou</button>}
                  <button className="btn sm ghost" type="button" onClick={() => setMudar(r)}>Mudar o mês ou tirar</button>
                </span>}
              </span>
              <span className="v"><Din v={r.valor} /></span>
            </li>
          )
        })}
      </ul>
      {chegaram.length > 0 && <p className="sub" style={{ marginTop: 8 }}>Já chegou neste mês: {textoPrivado(chegaram.map(r => `${r.descricao} (${r.meu ? 'seu' : r.dono_nome}, ${dataCurta(r.recebido_em!)})`).join('; '))}.</p>}
      {novo && <NovoReceb key={familia.id} fechar={() => setNovo(false)} salvar={salvarNovo} salvo={(r, ja) => { invalidarDados(api, familia.id); setNovo(false); setN(x => x + 1); toast(ja ? 'Já estava salvo' : `${r.descricao} anotado pra ${mesCurto(r.mes_previsto)}.`) }} />}
      {conferir && <ConfirmarReceita r={conferir} meses={pendentes(conferir)} fechar={() => setConferir(null)} confirmar={(m, v, d) => confirmar(conferir, m, v, d)} />}
      {mudar && <MudarReceb r={mudar} fonte={fontes.fontes[mudar.id]} pronto={fontes.pronto} fechar={() => setMudar(null)} salvarFonte={async (f, v) => {
        if (!await fontes.salvarFonte(mudar.id, f)) return false
        if (!await fontes.salvarControle(mudar.id, { ...fontes.controle[mudar.id], valor: Math.round(v * 100), atualizado_em: hoje })) return false
        // Config é a fonte da certeza; se esta etapa falhar, o formulário continua aberto para repetir.
        return await mexer(mudar.id, { certo: f.certeza === 'garantido' }, 'Fonte e valor atualizados.')
      }} mexer={async (m, aviso) => { if (await mexer(mudar.id, m, aviso)) setMudar(null) }} />}
    </section>
  )
}

function NovoReceb({ fechar, salvar, salvo }: { fechar: () => void; salvar: (r: NovoRecebimento & { chave: string }, fonte: FonteReceita | null) => Promise<void>; salvo: (r: NovoRecebimento, ja: boolean) => void }) {
  const trava = useRef(false)
  const operacao = useRef<NovoRecebimento & { chave: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [aguardando, setAguardando] = useState(false)
  const conferencia = useRef<(() => Promise<boolean>) | null>(null)
  const conferir = async () => {
    if (trava.current) return
    trava.current = true; setOcupado(true)
    try {
      if (!conferencia.current) throw new Error('Conferência indisponível.')
      if (await conferencia.current()) { salvo(operacao.current!, true); return }
      setAguardando(false); conferencia.current = null
      setErro('Não encontrei na lista. Pode tentar de novo.')
    } catch { setErro('Aguardando conferência. Não deu pra reler a lista. Tente conferir novamente.') }
    finally { trava.current = false; setOcupado(false) }
  }
  const [desc, setDesc] = useState(''), [v, setV] = useState(''), [mes, setMes] = useState(proximo(hojeRecife().slice(0, 7)))
  const [tipo, setTipo] = useState<TipoRecebimento>('contrato'), [erro, setErro] = useState('')
  const [fonte, setFonte] = useState<FonteReceita | null>(null)
  return (
    <Sheet titulo="Novo recebimento" fechar={() => { if (!ocupado && !aguardando) fechar() }}>
      <form style={{ display: 'grid', gap: 12 }} onSubmit={async e => {
        e.preventDefault()
        if (trava.current || aguardando) return
        if (!desc.trim()) { setErro('Diga o que é. Ex.: contrato de março, venda do carro.'); return }
        if (!valorDigitadoValido(v) || textoParaValor(v) <= 0) { setErro('Digite o valor, por exemplo 15.000.'); return }
        if (!mesReceitaValido(mes)) { setErro('Escolha o mês em que entra.'); return }
        if (fonte?.fim && (!mesReceitaValido(fonte.fim) || fonte.fim < mes || fonte.fim > '2031-12')) { setErro('O fim deve ser entre o primeiro mês e dezembro de 2031.'); return }
        const dados = { descricao: desc.trim(), valor: textoParaValor(v), mes_previsto: mes, tipo, certo: !fonte || fonte.certeza === 'garantido' }
        const { chave: _chave, ...anterior } = operacao.current || { chave: '' }
        if (!operacao.current || JSON.stringify(anterior) !== JSON.stringify(dados)) operacao.current = { ...dados, chave: novoUuid() }
        trava.current = true; setOcupado(true)
        try { await salvar(operacao.current, fonte); salvo(operacao.current, false) }
        catch (e) {
          if (e instanceof ErroRede) {
            setAguardando(true); setErro('Aguardando conferência…')
            conferencia.current = (e as ErroRede & { conferir?: () => Promise<boolean> }).conferir || null
            trava.current = false
            await conferir()
          } else setErro((e as Error).message)
        } finally { trava.current = false; setOcupado(false) }
      }}>
        <label className="campo"><span>O que é</span><CampoPrivado className="inp" value={desc} maxLength={120} placeholder="Ex.: contrato de consultoria" onChange={e => setDesc(e.target.value)} /></label>
        <div className="campo"><span>Quanto entra</span><CampoValor valor={v} mudar={setV} rotulo="Quanto entra" /></div>
        <label className="campo"><span>Mês em que entra</span><CampoPrivado className="inp" type="month" value={mes} min={hojeRecife().slice(0, 7)} onChange={e => setMes(e.target.value)} /></label>
        <div className="campo"><span id="rTipo">Que tipo é</span>
          <div className="pills" role="group" aria-labelledby="rTipo">{(Object.keys(TIPO) as TipoRecebimento[]).map(t => <button key={t} type="button" className="pill" aria-pressed={tipo === t} onClick={() => setTipo(t)}>{TIPO[t].replace(/^./, c => c.toUpperCase())}</button>)}</div>
          <small>13º salário não entra aqui: ele só conta nos pagamentos da folha.</small>
        </div>
        <CamposFonteReceita fonte={fonte || fonteInicial(true)} mudar={setFonte} inicio={mes} />
        {aguardando && <p role="status">Aguardando conferência <button type="button" disabled={ocupado} onClick={conferir}>Conferir novamente</button></p>}
        {erro && <p className="erro" role="alert">{textoPrivado(erro)}</p>}
        <button className="btn primary full" type="submit" disabled={ocupado || aguardando}>Anotar</button>
      </form>
    </Sheet>
  )
}
