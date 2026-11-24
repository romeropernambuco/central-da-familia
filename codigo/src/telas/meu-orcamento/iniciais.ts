/** Iniciais que não se repetem: Bruno e Bia viram "Br" e "Bi"; quem tem a letra sozinho fica com 1 letra. */
export function iniciaisDistintas(nomes: string[]): string[] {
  const primeira = (n: string) => (n || '?').trim().charAt(0).toUpperCase()
  return nomes.map(n => {
    const p = primeira(n)
    const repete = nomes.filter(o => primeira(o) === p).length > 1
    return repete ? p + (n || '').trim().charAt(1).toLowerCase() : p
  })
}
