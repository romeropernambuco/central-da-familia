// Onde fica cada sala na planta do escritório e as cores de piso e tapete. Não depende do Three.js.
export const SALAS: Record<
  string,
  { nome: string; rot: [number, number, number]; cx: number; cz: number; d: number; piso: number; tapete: number }
> = {
  gestao: { nome: 'Gestão', rot: [9, 2.45, -5.1], cx: 9, cz: -2.5, d: 5, piso: 0xdcc9aa, tapete: 0xb9a98c },
  apoio: { nome: 'Apoio', rot: [9, -0.1, 5.6], cx: 9, cz: 2.5, d: 5, piso: 0xdfcfb4, tapete: 0xa9b19a },
  caixa: { nome: 'Caixa', rot: [-6.1, 2.45, -2.5], cx: -3, cz: -2.5, d: 5, piso: 0xdcc9aa, tapete: 0xb9a98c },
  casa: { nome: 'Casa', rot: [3, 2.45, -5.1], cx: 3, cz: -2.5, d: 5, piso: 0xe4d8c4, tapete: 0xa9b19a },
  cartoes: { nome: 'Cartões', rot: [-6.1, 2.45, 2.5], cx: -3, cz: 2.5, d: 5, piso: 0xd2c4ad, tapete: 0x9fa8b3 },
  patrimonio: { nome: 'Patrimônio', rot: [4.7, -0.1, 5.6], cx: 3, cz: 2.5, d: 5, piso: 0xdfcfb4, tapete: 0xc2a98a },
  recepcao: { nome: 'Recepção', rot: [0, -0.1, 9.5], cx: 0, cz: 7.15, d: 4, piso: 0xe1d3bc, tapete: 0xb4a89a },
}

/** Roupa de quem ainda não está na lista da equipe (equipe.ts): a cena nunca fica sem boneco. */
export const RESERVA = [
  { camisa: 0x8c6a4a, calca: 0x2e3440, pele: 0xd6a27c, cabelo: 0x6a6a68, estilo: 'coque' },
  { camisa: 0x5e7c5a, calca: 0x34343c, pele: 0x9c6b4c, cabelo: 0x1b1410, estilo: 'longo' },
  { camisa: 0x4f7a78, calca: 0x2e3440, pele: 0xb98562, cabelo: 0x231a14, estilo: 'curto' },
]
