// Abre a sala 3D do palco do Meu orçamento (3ª versão). O Three.js, a cena e os móveis só são buscados aqui,
// quando o palco aparece na tela: quem não chega a ver o palco não baixa nada disso.
import type { AbrirCenaDoPalco, CenaDoPalco } from '../../componentes/EquipeDoOrcamento'
import { tentarCarregarCena } from '../../lib/escritorio/cenaBase'

export const abrirSalaDoOrcamento: AbrirCenaDoPalco = (el, opcoes, aoAbrir) => {
  const controle = new AbortController()
  let cena: CenaDoPalco | undefined
  const cancelar = tentarCarregarCena(
    async () => {
      const [T, modulo, { modelosEscritorio }] = await Promise.all([
        import('../escritorio/tres'),
        import('./cena/cenaOrcamento'),
        import('../escritorio/modelosEscritorio'),
      ])
      // móveis locais (public/modelos/escritorio); nada vem de fora do app
      const modelos = await modelosEscritorio.adquirir(modulo.MODELOS_DA_SALA, controle.signal).pronto
      if (!modelos) throw Error('móveis indisponíveis')
      return { T, modulo, modelos }
    },
    ({ T, modulo, modelos }) => {
      cena = modulo.montarCenaOrcamento(T, el, modelos, opcoes)
      aoAbrir(cena)
    },
    opcoes.aoFalhar,
  )
  return () => {
    cancelar()
    cena?.destruir()
    controle.abort()
  }
}
