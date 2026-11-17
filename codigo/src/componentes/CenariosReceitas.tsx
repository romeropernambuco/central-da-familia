import { Icone } from './Icone'
import { useApp } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { CENARIOS_RECEITAS, useCenarioReceitas } from '../app/useCenarioReceitas'
import { textoDaTaxa } from '../api/futuro'
import type { CenarioReceitas, ControleReceitas, FontesReceita } from '../api/tipos'
import { Din } from './base'
import { mesCurto, textoPrivado } from '../lib/formato'
import { numerosRumo2029 } from '../app/rumo2029'

export function CenariosReceitas({ fontes, controle, revisao }: { fontes: FontesReceita; controle: ControleReceitas; revisao: number }) {
  const { api, familia, versao, oculto } = useApp()
  const leitura = useLeituraRemota(`receitas:${api.modo}:${familia!.id}`, api.futuroEntradas ? () => api.futuroEntradas!(familia!.id) : null, [api, versao, revisao])
  const { cenario, escolher, resultados, resultado, erro } = useCenarioReceitas(leitura.dado, fontes, controle)
  const e = leitura.dado?.entrada
  return <div className="card f30-cenarios" style={{ marginBlock: 12 }}>
    <h3><Icone nome="plano2029" />Receitas e a renda de 2029</h3>
    <div className="pills" role="group" aria-label="Comparar cenários de receitas">{Object.entries(CENARIOS_RECEITAS).map(([c, t]) => <button type="button" className="pill" key={c} aria-pressed={cenario === c} onClick={() => escolher(c as CenarioReceitas)}>{t}</button>)}</div>
    <p className="sub">Garantido é o número oficial. Com previstos inclui prováveis; Com tudo inclui também incertos. A escolha fica só neste aparelho.</p>
    {leitura.erro && <p role="alert">Não foi possível atualizar os cenários. {leitura.dado ? 'Dados desatualizados.' : 'A comparação está indisponível.'} <button type="button" onClick={leitura.repetir}><Icone nome="desfazer" />Tentar de novo</button></p>}
    {oculto && <p className="todo">Comparação escondida. Abra o olho para conferir os cenários.</p>}
    {leitura.carregando && <p role="status">Atualizando a comparação…</p>}
    {erro && <p role="alert">{erro}</p>}
    {!oculto && resultados && e && (Object.keys(CENARIOS_RECEITAS) as CenarioReceitas[]).map(c => {
      const r = resultados[c]
      const n = numerosRumo2029(r, e)
      const saldo = (v: number) => <>{v > 0 ? 'faltam' : 'sobram'} <Din v={Math.abs(v) / 100} /> por mês</>
      return <div key={c} aria-current={cenario === c ? 'true' : undefined}><p>{CENARIOS_RECEITAS[c]}: {n.cobre_pct === null || n.falta_com_margem === null ? 'Informe o gasto necessário ou confira a taxa do Objetivo.' : <>{saldo(n.falta_com_margem)}, com margem de segurança.</>}</p>{n.cobre_pct !== null && <p className="sub">Sem a margem de segurança: {saldo(n.falta_sem_margem)}.</p>}</div>
    })}
    {!oculto && resultado && e && <div aria-label="Detalhes do cenário selecionado">
      <p>Renda sustentável das aplicações: <Din v={resultado.renda_sustentavel / 100} /> por mês. Aluguéis líquidos: <Din v={(resultado.aluguel_liquido_2029 ?? 0) / 100} /> por mês.</p>
      <p>{resultado.folga < 0 ? 'Falta de patrimônio' : 'Folga de patrimônio'}: <Din v={Math.abs(resultado.folga) / 100} />. Quando cobre: {resultado.patrimonio_necessario === null ? 'não calculável com esta taxa' : resultado.folga >= 0 ? 'na meta de janeiro de 2029' : 'ainda não cobre a meta de janeiro de 2029'}.</p>
      <p className="sub">Premissa — fonte: cadastro da família e taxas do Objetivo; data da conta: {textoPrivado(e.hoje, oculto)}. Taxa real de trabalho: {textoPrivado(textoDaTaxa(e.parametros.taxa_real_trabalho), oculto)}% ao ano; margem: {textoPrivado(textoDaTaxa(e.parametros.margem), oculto)}%. Estimativa, não promessa.</p>
      <details><summary>Ver taxas usadas até 2028</summary>{Object.entries(e.parametros.taxa_bruta_ano).map(([ano, t]) => <p key={ano}>{ano}: taxa bruta {textoPrivado(textoDaTaxa(t), oculto)}%; inflação {textoPrivado(textoDaTaxa(e.parametros.ipca_ano[Number(ano)]), oculto)}%; imposto da projeção {textoPrivado(textoDaTaxa(e.parametros.aliq_proj), oculto)}%.</p>)}</details>
    </div>}
    {!leitura.carregando && !leitura.erro && !e && <p>A comparação precisa dos dados do Objetivo. {leitura.dado?.motivo}</p>}
    {!!leitura.dado?.confirmar.length && <p className="sub">A confirmar: {textoPrivado(leitura.dado.confirmar.join('; '), oculto)}.</p>}
    <p className="sub">Repetições vão até {mesCurto('2031-12')} ou o fim informado. O motor conta entradas só até dezembro de 2028. Receitas depois disso ficam no cadastro e não viram renda permanente na conta oficial. Salário não é tratado como renda para viver a partir de 2029.</p>
  </div>
}
