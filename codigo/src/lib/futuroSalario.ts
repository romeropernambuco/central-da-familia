import type { FuturoEntrada } from './futuro'

/**
 * O salário entra na conta até a virada (decisão do dono, 22/11/2026: "o salário cai sempre; o que sobra vai para a
 * poupança e aumenta a carteira; a viagem sai da sobra, não da gordura"). Cada renda de Planejamento → Rendas vira 1
 * entrada por mês, do mês que vem até o mês anterior à virada. Extra fica de fora (vai para o guardado pela regra do
 * salário); a que muda todo mês conta pelo mês fraco. De 2029 em diante a família vive de rendimento: salário não entra.
 */
export function salariosAteAVirada(rendas: unknown, m0: string, virada: string): FuturoEntrada['recebimentos'] {
  if (!Array.isArray(rendas) || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m0)) return []
  const prox = (m: string) => {
    const [a, mm] = m.split('-').map(Number)
    return mm === 12 ? `${a + 1}-01` : `${a}-${String(mm + 1).padStart(2, '0')}`
  }
  const out: FuturoEntrada['recebimentos'] = []
  for (const r of rendas as {
    id?: unknown
    nome?: unknown
    valor?: unknown
    tipo?: unknown
    fraco?: unknown
    dono?: unknown
  }[]) {
    if (!r || typeof r !== 'object' || Array.isArray(r) || r.tipo === 'extra') continue
    const reais = Number(r.tipo === 'variavel' ? r.fraco : r.valor)
    if (!Number.isFinite(reais) || reais <= 0) continue
    const valor = Math.round(reais * 100)
    for (let m = prox(m0); m < virada; m = prox(m))
      out.push({
        id: `renda:${String(r.id ?? '')}@${m}`,
        dono: typeof r.dono === 'string' ? r.dono : '',
        valor,
        mes_previsto: m,
        mes_novo: null,
        certo: true,
        recebido: false,
        descricao: typeof r.nome === 'string' && r.nome.trim() ? r.nome.trim() : 'Salário',
      })
  }
  return out
}
