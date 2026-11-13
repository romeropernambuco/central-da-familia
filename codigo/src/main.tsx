// Porta de entrada. No modo exemplo (e no demo), o relógio de teste (?dia=, ?hora= e a pessoa do teste)
// carrega ANTES de tudo, pra mudar o dia antes de qualquer conta. Em produção esse import some do pacote (portão 6).
const relogio: Promise<unknown> = import.meta.env.MODE === 'exemplo' || import.meta.env.MODE === 'demo' ? import('./teste/relogio') : Promise.resolve()
relogio.then(() => import('./partida'))
