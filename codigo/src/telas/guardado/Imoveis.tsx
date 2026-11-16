import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { textoPrivado, CampoPrivado, CampoDecimal } from '../../componentes/privacidade'
// RODADA_PATRIMONIO (ordem do dono, 14/11): o bloco "Imóveis" dentro do Guardado (não é tela nova).
// Lista com apelido, dono, valor, aluguel líquido por mês, rentabilidade ao ano comparada com a das aplicações e o selo
// "com contrato" ou "sem contrato: não entra na conta"; folha de adicionar e editar com "?" em cada campo.
// Quem vê: só o casal (o Guardado já é só do casal; o banco também tranca). Filha e equipe nunca.
// A tela NUNCA calcula aluguel líquido nem rentabilidade: vêm de futuro() (lib/futuro, saida.imoveis). Só soma valores pra mostrar.
import { useEffect, useMemo, useState } from 'react'
import { Building2, Home, Plus } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { useFuturo } from '../../app/useDados2'
import { useAdultos } from '../../app/useMembros'
import { CampoValor, Din, Sheet, Vazio } from '../../componentes/base'
import { Qm } from '../../componentes/Qm'
import { imovelInvalido, taxaDoTexto, textoDaTaxa } from '../../api/futuro'
import { fraseRenova } from '../../componentes/Linha2028'
import type { ImovelTela, NovoImovel, UsoImovel } from '../../api/tipos'
import type { ImovelSaida } from '../../lib/futuro'
import { centavos, hojeRecife, mesCurto, reais, textoParaValor, valorDigitadoValido, valorParaTexto } from '../../lib/formato'
import { mesMais } from '../../lib/plano'

const USO: { v: UsoImovel; nome: string; ajuda: string }[] = [
  { v: 'mora', nome: 'A família mora', ajuda: 'Onde vocês moram: o valor aparece no patrimônio, mas não dá renda.' },
  { v: 'aluga', nome: 'Aluga', ajuda: 'Alugado para alguém (por mês ou por temporada).' },
  { v: 'parado', nome: 'Parado', ajuda: 'Fechado, sem aluguel nem venda combinada.' },
  { v: 'vende', nome: 'Vai vender', ajuda: 'Tem venda planejada: diga o valor e o mês lá embaixo.' },
]
const nomeUso = (u: UsoImovel) => (u === 'mora' ? 'a família mora' : u === 'aluga' ? 'aluga' : u === 'parado' ? 'parado' : 'vai vender')
const mesAno = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`
/** "0.032770" vira "3,3%". Só troca de formato. */
export const pctAno = (t: string | number) => `${(Number(t) * 100).toFixed(1).replace('.', ',')}%`

/** O selo de cada imóvel. Revisão E14 (M2): se o aluguel entra na conta, quem diz é o motor (imoveis[i].entra_na_conta);
 *  a tela só escreve. Com contrato que não entra (vencido ou curto), "Contrato acaba em MM/AAAA: renove pra contar".
 *  `entra` undefined = o motor ainda não fez a conta (imóvel novo na folha): não promete nada. */
export function seloImovel(i: Pick<ImovelTela, 'uso' | 'tem_contrato' | 'contrato_ate' | 'aluguel' | 'venda_valor' | 'venda_contrato'>, entra?: boolean,
  /** o gatilho "renova o contrato" do motor pra este imóvel (contrato curto), se houver */ renova?: { aluguel_para_em?: string | null; mes: string | null } | null): { texto: string; entra: boolean | null } | null {
  if (i.uso === 'mora') return { texto: 'onde mora: não rende', entra: false }
  if (i.uso === 'aluga' || i.aluguel > 0) {
    if (!i.tem_contrato) return { texto: 'sem contrato: não entra na conta', entra: false }
    if (!i.contrato_ate) return { texto: 'contrato sem data de fim: não entra na conta', entra: false }
    if (entra === undefined) return { texto: `contrato até ${mesAno(i.contrato_ate)}: a conta confere ao salvar`, entra: null }
    return entra ? { texto: `com contrato até ${mesAno(i.contrato_ate)}`, entra: true }
      : renova ? { texto: fraseRenova(renova), entra: false }
      : { texto: `Contrato acaba em ${mesAno(i.contrato_ate)}: renove para contar`, entra: false }
  }
  if (i.venda_valor != null) return i.venda_contrato ? { texto: 'venda com contrato', entra: true } : { texto: 'venda sem contrato: não entra na conta', entra: false }
  return null
}

export function Imoveis({ aplicado }: { aplicado: number }) {
  const { api, familia, versao, tentar, toast } = useApp()
  const { saida, atualizar } = useFuturo()
  const adultos = useAdultos()
  const [n, setN] = useState(0)
  const [folha, setFolha] = useState<ImovelTela | 'novo' | null>(null)
  const { dado: lista, erro: falha, carregando, repetir } = useLeituraRemota(`${familia?.id}:${familia?.membroId}:${familia?.papel}`, familia?.papel === 'casal' && api.imoveis ? () => api.imoveis!(familia.id) : null, [api, versao, n])
  const renovaDe = (id: string) => saida?.gatilhos?.find(g => g.origem === 'imovel' && g.id === id && g.motivo === 'renova o contrato') ?? null
  const doMotor = useMemo(() => new Map((saida?.imoveis || []).map(x => [x.id, x])), [saida])

  // filha e equipe nunca veem imóveis
  if (!familia || familia.papel !== 'casal' || !api.imoveis) return null
  const imoveis = lista || []
  const somaImoveis = centavos(imoveis.reduce((s, i) => s + i.valor, 0))
  const taxaAplic = saida?.imoveis?.[0]?.taxa_real_aplicacoes

  async function salvar(id: string | null, d: NovoImovel) {
    if (!familia) return false
    const ok = await tentar(() => api.imovelSalvar!(familia.id, id, d))
    if (ok) { setN(x => x + 1); atualizar(); toast(`${d.apelido.trim()} ${id ? 'atualizado' : 'guardado nos imóveis'}.${!id && adultos !== 1 ? ' A outra pessoa do casal vê, com o seu nome.' : ''}`) }
    return ok
  }
  async function tirar(i: ImovelTela) {
    if (!familia) return
    if (await tentar(() => api.imovelTirar!(familia.id, i.id))) { setN(x => x + 1); atualizar(); setFolha(null); toast(`${i.apelido} saiu da lista.`) }
  }

  return (
    <section className="card imoveis" aria-labelledby="gImo">
      <div className="card-h"><h2 id="gImo"><Building2 size={24} aria-hidden="true" />Imóveis</h2><button className="lnk" type="button" onClick={() => setFolha('novo')}><Plus size={16} />Imóvel</button></div>
      {/* patrimônio total: aplicado + imóveis, com o imóvel à parte */}
      <p>Gestor do Guardado: quer cadastrar um imóvel?</p><button type="button" className="btn line" onClick={() => setFolha('novo')}>Cadastrar imóvel</button>
      {lista && <dl className="imo-total">
        <div className="tot"><dt>Patrimônio total</dt><dd><Din v={centavos(aplicado + somaImoveis)} /></dd></div>
        <div><dt>Aplicado</dt><dd><Din v={aplicado} /></dd></div>
        <div><dt>Imóveis, à parte</dt><dd><Din v={somaImoveis} /></dd></div>
      </dl>}
      <p className="sub imo-frase">Imóvel não é vendido pelo plano: o valor só aparece aqui, nunca vira saque. Só o aluguel com contrato entra na conta de 2029.</p>
      {carregando && <p role="status">Buscando imóveis…</p>}
      {falha && <p role="alert">Não foi possível buscar os imóveis. {lista && 'Dados desatualizados.'} <button type="button" onClick={repetir}>Tentar novamente</button></p>}
      {lista === null || (!imoveis.length && (falha || carregando)) ? null : !imoveis.length ? <Vazio ico={<Home size={24} />}>Nenhum imóvel anotado. Toque em "Imóvel" para anotar casa, sala, lote ou apartamento.</Vazio> : (
        <ul className="list">
          {imoveis.map(i => {
            const m: ImovelSaida | undefined = doMotor.get(i.id)
            const selo = seloImovel(i, m?.entra_na_conta, renovaDe(i.id))
            const dono = i.meu ? 'seu' : `de ${i.dono_nome || ''}`
            return (
              <li key={i.id} {...(i.meu ? {} : { 'data-do-outro': textoPrivado(i.dono_nome || '') })}>
                <button className="li imo" type="button" onClick={() => setFolha(i)} aria-label={`${textoPrivado(i.apelido)}, ${i.meu ? dono : textoPrivado(dono)}, vale ${reais(i.valor)}${selo ? `, ${textoPrivado(selo.texto)}` : ''}. ${i.meu ? 'Abrir para mudar.' : 'Abrir para ver.'}`}>
                  <span className="tile"><Building2 size={20} /></span>
                  <span className="m"><b className="quebra">{textoPrivado(i.apelido)}</b>
                    <small>{adultos !== 1 && <>{textoPrivado(i.dono_nome)} · </>}{textoPrivado(nomeUso(i.uso))}</small>
                    {m && i.uso !== 'mora' && m.aluguel_liquido_mes > 0 && <small className="imo-renda">Aluguel líquido <strong>{reais(m.aluguel_liquido_mes / 100)}</strong> por mês · rende <strong>{pctAno(m.rentabilidade_ano)}</strong> ao ano{m.taxa_real_aplicacoes ? `; o aplicado rende ${pctAno(m.taxa_real_aplicacoes)}` : ''}</small>}
                    {i.venda_valor != null && i.venda_mes && <small>Venda planejada: {reais(i.venda_valor)} em {mesCurto(i.venda_mes + '-01')}</small>}
                    {selo && <small className={'imo-selo ' + (selo.entra ? 'ok' : 'warn')}>{textoPrivado(selo.texto)}</small>}
                  </span>
                  <span className="v"><Din v={i.valor} /></span>
                </button>
                {!i.meu && <NomeDaPessoa pessoa={{ tipo: 'membro', id: i.dono_membro, nome: i.dono_nome }} />}
              </li>
            )
          })}
        </ul>
      )}
      {taxaAplic && imoveis.some(i => i.uso !== 'mora') && <p className="sub" style={{ marginTop: 8 }}>A rentabilidade é o aluguel líquido de 1 ano dividido pelo valor do imóvel, já sem custos, meses vazios e imposto. O dinheiro aplicado rende {pctAno(taxaAplic)} ao ano acima da inflação.</p>}
      {folha && <FolhaImovel inicial={folha === 'novo' ? null : folha} entraHoje={folha === 'novo' ? undefined : doMotor.get(folha.id)?.entra_na_conta} renovaHoje={folha === 'novo' ? null : renovaDe(folha.id)} fechar={() => setFolha(null)} salvar={salvar} tirar={tirar} />}
    </section>
  )
}

const meses = (de: string, n: number) => Array.from({ length: n }, (_, i) => mesMais(de, i))

/** A folha de adicionar e editar. Cada campo com "?" dizendo o que é. O do outro adulto abre só pra ler. */
export function FolhaImovel({ inicial, fechar, salvar, tirar, entraHoje, renovaHoje }: { inicial: ImovelTela | null; fechar: () => void; salvar: (id: string | null, d: NovoImovel) => Promise<boolean>; tirar: (i: ImovelTela) => void
  /** o que o motor disse do imóvel como está salvo (só vale se o contrato não mudou na folha) */ entraHoje?: boolean
  renovaHoje?: { aluguel_para_em?: string | null; mes: string | null } | null }) {
  const so = !!inicial && !inicial.meu
  const m0 = hojeRecife().slice(0, 7)
  const [f, setF] = useState(() => ({
    apelido: inicial?.apelido || '', valor: inicial ? valorParaTexto(inicial.valor) : '', uso: (inicial?.uso || 'parado') as UsoImovel,
    aluguel: inicial ? valorParaTexto(inicial.aluguel) : '', custos: inicial ? valorParaTexto(inicial.custos) : '', vacancia: inicial ? textoDaTaxa(inicial.vacancia) : '0',
    contrato: inicial?.tem_contrato ?? false, contrato_ate: inicial?.contrato_ate || mesMais(m0, 12),
    vende: inicial?.venda_valor != null, venda_valor: inicial?.venda_valor != null ? valorParaTexto(inicial.venda_valor) : '', venda_mes: inicial?.venda_mes || mesMais(m0, 12), venda_contrato: inicial?.venda_contrato ?? false,
  }))
  const [gravando, setGravando] = useState(false)
  const aluga = f.uso === 'aluga'
  const vac = taxaDoTexto(f.vacancia || '0')
  const d: NovoImovel = {
    apelido: f.apelido, valor: textoParaValor(f.valor), uso: f.uso,
    aluguel: aluga ? textoParaValor(f.aluguel) : 0, custos: aluga ? textoParaValor(f.custos) : 0, vacancia: aluga && vac ? vac : '0',
    tem_contrato: aluga && f.contrato, contrato_ate: aluga && f.contrato ? f.contrato_ate : null,
    venda_valor: f.vende ? textoParaValor(f.venda_valor) : null, venda_mes: f.vende ? f.venda_mes : null, venda_contrato: f.vende && f.venda_contrato,
  }
  const falta = !f.valor || !valorDigitadoValido(f.valor) || d.valor <= 0 ? 'Digite quanto vale o imóvel.'
    : aluga && f.aluguel && !valorDigitadoValido(f.aluguel) ? 'Digite o aluguel médio por mês.'
    : aluga && f.custos && !valorDigitadoValido(f.custos) ? 'Confira os custos por mês.'
    : aluga && (vac == null || Number(vac) < 0 || Number(vac) > 1) ? 'Os meses vazios vão de 0 a 100.'
    : f.vende && (!f.venda_valor || !valorDigitadoValido(f.venda_valor)) ? 'Digite por quanto pensa vender.'
    : imovelInvalido(d)
  const ver = (k: keyof typeof f) => (v: string) => setF({ ...f, [k]: v })
  const q = (titulo: string, nota: string) => <Qm titulo={textoPrivado(titulo)} linhas={[]} nota={nota} />
  return (
    <Sheet titulo={textoPrivado(inicial ? (so ? inicial.apelido : 'Mudar imóvel') : 'Novo imóvel')} fechar={fechar}>
      {so && <p className="todo"><span>Este imóvel é de <NomeDaPessoa pessoa={{ tipo: 'membro', id: inicial!.dono_membro, nome: inicial!.dono_nome }} />: só {textoPrivado(inicial!.dono_nome || 'quem anotou')} muda.</span></p>}
      <fieldset className="imo-form" disabled={so}>
        <label className="campo"><span>Apelido {textoPrivado(q('Apelido', 'Um nome curto para família reconhecer: "sala do centro", "casa da praia". Não precisa de endereço.'))}</span><CampoPrivado className="inp" maxLength={60} placeholder="Ex.: sala do centro" value={f.apelido} onChange={e => setF({ ...f, apelido: e.target.value })} /></label>
        <div className="campo"><span>Quanto vale hoje {q('Quanto vale hoje', 'O valor estimado de venda hoje (pode ser o da avaliação ou o de imóveis parecidos na mesma rua). Só aparece no patrimônio; o plano nunca vende o imóvel.')}</span><CampoValor valor={f.valor} mudar={ver('valor')} rotulo="Quanto vale hoje" /></div>
        <div className="campo"><span id="imoUso">Pra que serve {q('Pra que serve', 'Mora: não rende nada. Aluga: o aluguel pode entrar na conta (só com contrato assinado). Parado: só aparece no patrimônio. Vai vender: diga a venda planejada.')}</span>
          <div className="pills" role="group" aria-labelledby="imoUso">{USO.map(u => <button key={u.v} type="button" className="pill" aria-pressed={f.uso === u.v} onClick={() => setF({ ...f, uso: u.v, vende: u.v === 'vende' ? true : f.vende })}>{u.nome}</button>)}</div>
          <small>{USO.find(u => u.v === f.uso)!.ajuda}</small>
        </div>
        {aluga && <>
          <div className="campo"><span>Aluguel médio por mês {q('Aluguel médio por mês', 'O que o inquilino paga por mês, antes dos custos. Se aluga por temporada, some o que recebe no ano e divida por 12.')}</span><CampoValor valor={f.aluguel} mudar={ver('aluguel')} rotulo="Aluguel médio por mês" /></div>
          <div className="campo"><span>Custos por mês {q('Custos por mês', 'O que sai do seu bolso todo mês com o imóvel: IPTU dividido por 12, condomínio e manutenção. Sai do aluguel.')}</span><CampoValor valor={f.custos} mudar={ver('custos')} rotulo="Custos por mês" /></div>
          <label className="campo"><span>Meses vazios (%) {q('Meses vazios', 'A parte do ano em que o imóvel fica sem inquilino. Ex.: 1 mês vazio por ano é perto de 8%. Sai do aluguel.')}</span><CampoDecimal className="inp" inputMode="decimal" value={f.vacancia} onChange={e => setF({ ...f, vacancia: e.target.value.replace(/[^\d,]/g, '') })} /></label>
          <div className="campo"><span id="imoCont">Tem contrato assinado? {q('Contrato assinado', 'Com contrato, o aluguel líquido entra na conta de 2029 até o mês em que o contrato acaba. Sem contrato, aparece como "pode entrar" e fica fora da conta.')}</span>
            <div className="pills" role="group" aria-labelledby="imoCont">
              <button type="button" className="pill" aria-pressed={f.contrato} onClick={() => setF({ ...f, contrato: true })}>Sim</button>
              <button type="button" className="pill" aria-pressed={!f.contrato} onClick={() => setF({ ...f, contrato: false })}>Não</button>
            </div>
          </div>
          {f.contrato && <label className="campo"><span>Contrato vale até {q('Contrato vale até', 'O último mês do contrato. Depois dele o aluguel sai da conta, até a família anotar o contrato novo.')}</span>
            <select className="inp" value={f.contrato_ate} onChange={e => setF({ ...f, contrato_ate: e.target.value })}>{meses(m0, 120).map(m => <option key={m} value={m}>{mesCurto(m + '-01')}</option>)}</select></label>}
        </>}
        <div className="campo"><span id="imoVende">Venda planejada? {q('Venda planejada', 'Se pensa vender. Só entra na conta como dinheiro que chega com contrato de venda assinado; sem contrato, aparece como "pode entrar".')}</span>
          <div className="pills" role="group" aria-labelledby="imoVende">
            <button type="button" className="pill" aria-pressed={!f.vende} onClick={() => setF({ ...f, vende: false })}>Não</button>
            <button type="button" className="pill" aria-pressed={f.vende} onClick={() => setF({ ...f, vende: true })}>Sim</button>
          </div>
        </div>
        {f.vende && <>
          <div className="campo"><span>Por quanto vende {q('Por quanto vende', 'O valor que espera receber na venda.')}</span><CampoValor valor={f.venda_valor} mudar={ver('venda_valor')} rotulo="Por quanto vende" /></div>
          <label className="campo"><span>Mês da venda</span><select className="inp" value={f.venda_mes} onChange={e => setF({ ...f, venda_mes: e.target.value })}>{meses(m0, 120).map(m => <option key={m} value={m}>{mesCurto(m + '-01')}</option>)}</select></label>
          <div className="campo"><span id="imoVc">A venda tem contrato assinado?</span>
            <div className="pills" role="group" aria-labelledby="imoVc">
              <button type="button" className="pill" aria-pressed={f.venda_contrato} onClick={() => setF({ ...f, venda_contrato: true })}>Sim</button>
              <button type="button" className="pill" aria-pressed={!f.venda_contrato} onClick={() => setF({ ...f, venda_contrato: false })}>Não</button>
            </div>
          </div>
        </>}
        {(() => {
          const igual = !!inicial && inicial.tem_contrato === d.tem_contrato && inicial.contrato_ate === d.contrato_ate && inicial.uso === d.uso
          const s = seloImovel(d, igual ? entraHoje : undefined, igual ? renovaHoje : null)
          return s ? <p className={'todo ' + (s.entra ? 'ok' : s.entra === false ? 'warn' : '')}><span>{textoPrivado(s.entra ? `Entra na conta de 2029: ${s.texto}.` : s.entra === false ? `Fica fora da conta: ${s.texto}.` : `${s.texto[0].toUpperCase()}${s.texto.slice(1)}.`)}</span></p> : null
        })()}
      </fieldset>
      {!so && <>
        {falta && (f.apelido || f.valor) ? <p className="sub" style={{ marginTop: 8 }}>{textoPrivado(falta)}</p> : null}
        <button className="btn primary full" type="button" disabled={!!falta || gravando} style={{ marginTop: 12 }} onClick={async () => { setGravando(true); const ok = await salvar(inicial?.id ?? null, d); setGravando(false); if (ok) fechar() }}>Salvar</button>
        {inicial && <button className="btn line full" type="button" style={{ marginTop: 8 }} onClick={() => tirar(inicial)}>Tirar da lista</button>}
      </>}
    </Sheet>
  )
}
