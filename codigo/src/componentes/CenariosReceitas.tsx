import { useApp } from '../app/contexto'
import { useLeituraRemota } from '../app/useLeituraRemota'
import { CENARIOS_RECEITAS, useCenarioReceitas } from '../app/useCenarioReceitas'
import { textoDaTaxa } from '../api/futuro'
import type { CenarioReceitas, ControleReceitas, FontesReceita } from '../api/tipos'
import { Din } from './base'
import { mesCurto, textoPrivado } from '../lib/formato'
import { rendaSustentavel } from '../lib/futuro'

export function CenariosReceitas({ fontes, controle, revisao }: { fontes: FontesReceita; controle: ControleReceitas; revisao: number }) {
  const { api, familia, versao, oculto } = useApp()
  const leitura = useLeituraRemota(`receitas:${api.modo}:${familia!.id}`, api.futuroEntradas ? () => api.futuroEntradas!(familia!.id) : null, [api, versao, revisao])
  const { cenario, escolher, resultados, resultado, erro } = useCenarioReceitas(leitura.dado, fontes, controle)
  const e = leitura.dado?.entrada
  return <div className="card" style={{ marginBlock: 12 }}>
    <h3>Receitas e a renda de 2029</h3>
    <div className="pills" role="group" aria-label="Comparar cenários de receitas">{Object.entries(CENARIOS_RECEITAS).map(([c, t]) => <button type="button" className="pill" key={c} aria-pressed={cenario === c} onClick={() => escolher(c as CenarioReceitas)}>{t}</button>)}</div>
    <p className="sub">Garantido é o número oficial. Com previstos inclui prováveis; Com tudo inclui também incertos. A escolha fica só neste aparelho.</p>
    {leitura.erro && <p role="alert">Não deu para atualizar os cenários. {leitura.dado ? 'Dados desatualizados.' : 'A comparação está indisponível.'} <button type="button" onClick={leitura.repetir}>Tentar de novo</button></p>}
    {leitura.carregando && <p role="status">Atualizando a comparação…</p>}
    {erro && <p role="alert">{erro}</p>}
    {resultados && e && (Object.keys(CENARIOS_RECEITAS) as CenarioReceitas[]).map(c => {
      const r = resultados[c]
      // O corte e a conversão da folga usam as funções do próprio motor, incluindo a margem.
      const falta = r.ajustes_falta?.cortar_por_mes_2029
      return <p key={c} aria-current={cenario === c ? 'true' : undefined}>{CENARIOS_RECEITAS[c]}: {r.patrimonio_necessario === null ? 'sem renda sustentável calculável com esta taxa' : r.folga < 0 ? <>faltam <Din v={(falta ?? 0) / 100} /> por mês, com a margem</> : <>sobram <Din v={rendaSustentavel(r.folga, r.renda?.taxa_real_anual ?? e.parametros.taxa_real_trabalho) / 100} /> por mês, com a margem</>}.</p>
    })}
    {resultado && e && <div aria-label="Detalhes do cenário selecionado">
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
