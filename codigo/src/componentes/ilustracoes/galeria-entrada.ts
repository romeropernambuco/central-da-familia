// Entrada própria: não é importada pelo app, não altera o roteador nem o menu.
// Vite elimina o import e seus estilos em qualquer build de produção.
if (import.meta.env.DEV) {
  void import('./Galeria').then(({ montarGaleria }) => montarGaleria())
}
