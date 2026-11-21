import { valoresOcultos } from '../lib/olho'
import { useOlhoApp } from './contexto'

/** O olho está fechado? Serve também para peça desenhada fora do app (prévia, teste): aí vale o que o aparelho guardou. */
export const useOculto = () => useOlhoApp()?.oculto ?? valoresOcultos()
