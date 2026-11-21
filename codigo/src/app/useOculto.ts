import { valoresOcultos } from '../lib/olho'
import { useApp } from './contexto'

/** O olho está fechado? Serve também para peça desenhada fora do app (prévia, teste): aí vale o que o aparelho guardou. */
export const useOculto = () => useApp()?.oculto ?? valoresOcultos()
