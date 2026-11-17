import { useResumoFamilia } from '../../app/useResumoFamilia'
import { useApp } from '../../app/contexto'
import { enderecoDestino, type DestinoResumo } from '../../app/destinos'
import { Icone, type NomeIcone } from '../../componentes/Icone'
import { dataCurta } from '../../lib/formato'
import type { CampoResumo, Dinheiro, ResumoFamilia as Resumo } from '../../lib/resumo/tipos'
import { InformarSaldo } from '../planejamento/SaldoConta'
import { useState } from 'react'
import './resumo.css'

const dinheiro = (v: number, oculto: boolean) => oculto ? '••••' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const valor = (d: Dinheiro, oculto: boolean) => dinheiro(d.unidade === 'centavos' ? d.valor / 100 : d.valor, oculto)
interface Item { chave: keyof Resumo; titulo: string; icone: NomeIcone; destino: DestinoResumo; numero: string; frase: string; acao?: string }
export function itensResumo(r: Resumo, hoje: string, oculto: boolean): Item[] {
  const p = r.podeGastarHoje.valor, f = r.faturas.valor, rec = r.recebimentos.valor, c = r.casa.valor, m = r.movimentacaoMes.valor, d = r.desejos.valor, fila = r.pendencias.valor
  const privado = (t: string) => oculto ? '••••' : t
  return [
    { chave: 'saldoConta', titulo: 'Saldo em conta', icone: 'orcamento', numero: r.saldoConta.valor ? valor(r.saldoConta.valor, oculto) : '', frase: 'Contas correntes cadastradas.', destino: { rota: 'planejamento', secao: 'saldo' } },
    { chave: 'podeGastarHoje', titulo: 'Hoje você pode gastar', icone: 'inicio', numero: p ? valor(p.valor, oculto) : '', frase: p ? privado(`${p.escopo === 'pessoal' ? 'Seu orçamento' : 'Orçamento familiar'}${p.devendo ? ' · fica devendo no mês' : ''}`) : '', destino: { rota: 'orcamento', secao: 'orcamento' } },
    { chave: 'faturas', titulo: 'Faturas a vencer/conferir', icone: 'cartoes', numero: f ? dinheiro(f.total, oculto) : '', frase: f ? privado(f.lista.length ? `${f.lista.length} a vencer ou conferir nos próximos 30 dias.` : 'Nenhuma fatura a conferir nos próximos 30 dias.') : '', destino: { rota: 'cartoes', secao: 'fatura', entidade: f?.lista[0]?.cartao_id, periodo: f?.lista[0]?.mes } },
    { chave: 'aplicacoes', titulo: 'Aplicações', icone: 'guardado', numero: r.aplicacoes.valor ? dinheiro(r.aplicacoes.valor.total, oculto) : '', frase: 'Dinheiro aplicado, separado dos imóveis.', destino: { rota: 'guardado', secao: 'aplicacoes' } },
    { chave: 'recebimentos', titulo: 'Recebimentos previstos', icone: 'lancamentos', numero: rec ? dinheiro(rec.previsto, oculto) : '', frase: rec ? privado(`Garantido ${dinheiro(rec.garantido, false)} · provável ${dinheiro(rec.provavel, false)} · incerto ${dinheiro(rec.incerto, false)} · ${rec.atrasados} atrasados.`) : '', destino: { rota: 'planejamento', secao: 'recebimentos', periodo: hoje.slice(0, 7) } },
    { chave: 'plano2029', titulo: 'Plano 2029', icone: 'plano2029', numero: r.plano2029.valor ? dinheiro(r.plano2029.valor.renda / 100, oculto) : '', frase: 'Renda mensal estimada · cenário oficial Garantido.', destino: { rota: 'planejamento', secao: 'plano2029' } },
    { chave: 'casa', titulo: 'Casa', icone: 'casa', numero: c ? privado(c.falta === null ? 'Estoque não conferido' : `${c.falta} itens em falta`) : '', frase: c ? privado([c.feira ? 'Feira ainda sem confirmação' : 'Feira: sem pergunta pendente', `${c.nota} notas pendentes`, c.estoque ? 'Contagem pendente' : 'Estoque conferido'].join(' · ')) : '', destino: c?.tarefa ? { rota: 'escritorio', secao: 'tarefa', entidade: c.tarefa } : { rota: 'casa', secao: 'feira' } },
    { chave: 'imoveis', titulo: 'Imóveis', icone: 'guardado', numero: r.imoveis.valor ? valor(r.imoveis.valor.valor, oculto) : '', frase: r.imoveis.valor ? privado(`Aluguel líquido ESTIMADO: ${r.imoveis.valor.aluguel ? valor(r.imoveis.valor.aluguel, oculto) : 'não foi possível conferir'}.`) : '', destino: { rota: 'guardado', secao: 'imoveis' } },
    { chave: 'movimentacaoMes', titulo: 'Gastos e entradas do mês', icone: 'lancamentos', numero: m ? dinheiro(m.saldo, oculto) : '', frase: m ? privado(`Entrou ${dinheiro(m.entrou, false)} · saiu ${dinheiro(m.saiu, false)} · saldo realizado.`) : '', destino: { rota: 'lancamentos', secao: 'mes', periodo: hoje.slice(0, 7) } },
    { chave: 'desejos', titulo: 'Desejos', icone: 'desejos', numero: d ? privado(`${d.pensando} pensando`) : '', frase: d ? privado(`${d.combinados} combinados.`) : '', destino: { rota: 'desejos', secao: 'desejo', entidade: d?.primeiro } },
    { chave: 'pendencias', titulo: 'Precisa de você', icone: 'escritorio', numero: fila ? privado(`${fila.total} na fila`) : '', frase: fila ? privado(fila.primeira?.assunto || 'Nenhuma tarefa pendente.') : '', destino: { rota: 'escritorio', secao: 'tarefa', entidade: fila?.primeira?.id } },
  ]
}
export function CartaoResumo({ item, campo, repetir, extra }: { item: Item; campo: CampoResumo<unknown>; repetir: () => void; extra?: React.ReactNode }) {
  if (campo.estado === 'restrito') return null
  const pronto = campo.estado === 'pronto', erro = campo.estado === 'erro'
  return <article className="resumo-item" data-bloco={item.chave} data-estado={campo.estado}>
    <a href={enderecoDestino(item.destino)} className="resumo-link">
      <span className="resumo-icone"><Icone nome={item.icone} aria-hidden="true" /></span>
      <span className="resumo-corpo"><span className="resumo-rotulo">{item.titulo}</span>
        <strong className="resumo-numero">{pronto ? item.numero : campo.estado === 'carregando' ? 'Conferindo...' : erro ? 'Não foi possível conferir' : campo.motivo || 'Dado indisponível'}</strong>
        {pronto && <span className="resumo-frase">{item.frase}</span>}
        {pronto && <small className="resumo-meta"><span className="resumo-natureza">{campo.fonte[0]?.natureza}</span> · {campo.conferidoEm ? `Conferido em ${dataCurta(campo.conferidoEm.slice(0, 10))}` : 'Sem conferência registrada'}</small>}
      </span><Icone nome="abrir" aria-hidden="true" />
    </a>
    {erro && <button className="lnk resumo-repetir" type="button" onClick={repetir}>Tentar de novo</button>}{extra}
  </article>
}
export function ResumoApresentacao({ resumo, hoje, oculto, repetir, informarSaldo }: { resumo: Resumo; hoje: string; oculto: boolean; repetir: (k: keyof Resumo) => void; informarSaldo?: () => void }) {
  const itens = itensResumo(resumo, hoje, oculto)
  return <section className="resumo-familia" aria-label="Resumo da família"><h2 className="sec-t">Resumo da família</h2>
    <div className="resumo-grade">{itens.slice(0, 6).map(item => <CartaoResumo key={item.chave} item={item} campo={resumo[item.chave]} repetir={() => repetir(item.chave)} extra={item.chave === 'saldoConta' && informarSaldo && <button className="lnk resumo-repetir" onClick={informarSaldo}>Informar saldo</button>} />)}</div>
    {resumo.podeGastarHoje.valor && <p className="resumo-casa">Casa · disponível hoje: {dinheiro(resumo.podeGastarHoje.valor.casa, oculto)}</p>}
    <div className="resumo-complemento">{itens.slice(6).map(item => <CartaoResumo key={item.chave} item={item} campo={resumo[item.chave]} repetir={() => repetir(item.chave)} />)}</div>
    {resumo.plano2029.estado !== 'restrito' && <p className="sub">Dívidas ainda não cadastradas nesta visão.</p>}
  </section>
}
function ResumoAutorizado() {
  const { resumo, repetir, hoje, api, familia } = useResumoFamilia()
  const { oculto } = useApp()
  const [saldo, setSaldo] = useState(false)
  return <><ResumoApresentacao resumo={resumo} repetir={repetir} hoje={hoje} oculto={oculto} informarSaldo={familia?.papel === 'casal' && api.salvarSaldoConta ? () => setSaldo(true) : undefined} />{saldo && <InformarSaldo fechar={() => setSaldo(false)} />}</>
}
export function ResumoFamilia() {
  const { familia } = useApp()
  return familia && familia.papel !== 'equipe' ? <ResumoAutorizado key={`${familia.id}:${familia.membroId}:${familia.papel}`} /> : null
}
