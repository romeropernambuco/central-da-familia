// Entrada própria, sem referência a partir do aplicativo.
if (import.meta.env.DEV) {
  if (import.meta.env.MODE === 'exemplo' || import.meta.env.MODE === 'demo') {
    void import('./Propostas').then(({ montarPropostas }) => montarPropostas())
  } else {
    document.getElementById('propostas-root')!.textContent = 'Abra o laboratório com npm run dev:exemplo.'
  }
}
