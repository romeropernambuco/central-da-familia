import type { ImovelTela } from '../../api/tipos'
import { centavos } from '../formato'
/** Reais; aluguel e rentabilidade continuam vindo de futuro(). */
export const totalImoveis = (imoveis: ImovelTela[]) => centavos(imoveis.reduce((s, i) => s + i.valor, 0))
export const patrimonioTotal = (aplicado: number, imoveis: number) => centavos(aplicado + imoveis)
