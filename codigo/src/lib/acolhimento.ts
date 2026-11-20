let pendente = false
export function prepararAcolhimento() {
  pendente = true
}
export function temAcolhimento() {
  return pendente
}
export function encerrarAcolhimento() {
  pendente = false
}
