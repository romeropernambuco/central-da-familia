// SÓ PRO TESTE (carregado só nos builds de exemplo e demo, pelo main.tsx): abre o app como uma pessoa da família de exemplo e num dia escolhido.
//   ?como=ana | bruno | filha | equipe | autonoma     (sem nada: ana; autonoma = Cláudia, Família Souza)
//   ?dia=2026-11-18                              (sem nada: hoje de verdade)
//   ?hora=20                                     (sem nada: a hora de agora)
// O main.tsx carrega este arquivo antes do resto do app: o relógio muda antes de qualquer conta do exemplo.

export type Pessoa = 'ana' | 'bruno' | 'filha' | 'equipe' | 'autonoma'

const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams()

export const pessoaDoTeste: Pessoa = (['ana', 'bruno', 'filha', 'equipe', 'autonoma'] as const).find(p => p === (q.get('como') || '').toLowerCase()) || 'ana'

const dia = q.get('dia') || ''
const hora = q.get('hora') || ''
if (/^\d{4}-\d{2}-\d{2}$/.test(dia) && typeof globalThis.Date === 'function') {
  const Real = globalThis.Date
  const agora = new Real()
  const hh = /^\d{1,2}$/.test(hora) ? Number(hora) : Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Recife', hour: '2-digit', hour12: false }).format(agora)) % 24
  const mm = /^\d{1,2}$/.test(hora) ? 0 : agora.getMinutes()
  const alvo = Real.parse(`${dia}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00-03:00`)
  const desvio = alvo - agora.getTime()
  class Relogio extends Real {
    constructor(...a: any[]) {
      if (a.length === 0) super(Real.now() + desvio)
      else super(...(a as [any]))
    }
    static now() { return Real.now() + desvio }
  }
  ;(globalThis as any).Date = Relogio
}
