// Resposta crua do banco: ainda sem formato conferido. Cada campo é "não sei o que é" até alguém converter.
// É o contrário de `any`: aqui o TypeScript obriga a converter (num, txt, String) ou a dizer por escrito o formato esperado.

/** Um objeto que veio do banco, campo por campo ainda desconhecido. */
export type Cru = Record<string, unknown>

/** Lê qualquer valor como objeto cru. O que não for objeto (vazio, número, texto) vira objeto sem campos. */
export const cru = (v: unknown): Cru => (v && typeof v === 'object' ? (v as Cru) : {})

/** Lê qualquer valor como lista de objetos crus. O que não for lista vira lista vazia. */
export const lista = (v: unknown): Cru[] => (Array.isArray(v) ? (v as Cru[]) : [])
