import { useEffect, useRef } from 'react'
import { useAcoes, useDadosDoDia, useSessaoAtual } from './contexto'
import { desfazer } from '../api/desfazer'

/** O banco cria os limites dos adultos como "Pessoa 1" e "Pessoa 2" e liga cada adulto a um deles ao entrar. */
export const limiteSemNome = (nome: string) => /^Pessoa \d+$/.test(nome)

/**
 * Quem é do casal e ainda está com o limite "Pessoa N" ganha o próprio nome nele, 1 vez, ao abrir o app.
 * Simulação de 22/11 (casal e filha): o Caio entrava pelo convite e o limite dele continuava "Pessoa 2" para todos.
 * Não muda o banco: usa a mesma gravação do nome do limite que o casal já tem (envelopes.nome).
 */
export function useNomeNoLimite() {
  const { api, familia } = useSessaoAtual()
  const { resumo } = useDadosDoDia()
  const { recarregar } = useAcoes()
  const feito = useRef('')
  useEffect(() => {
    if (!familia || familia.papel !== 'casal' || !familia.membroNome?.trim() || !resumo?.envelopes) return
    const meu = resumo.envelopes.find(e => e.id === familia.envelopeId && !e.casa)
    if (!meu || !limiteSemNome(meu.nome)) return
    const chave = familia.id + ':' + meu.id
    if (feito.current === chave) return
    feito.current = chave
    void api
      .salvarEnvelope(familia.id, meu.id, { nome: familia.membroNome.trim().slice(0, 60) })
      .then(() => {
        // não é uma edição da pessoa: nada para desfazer
        desfazer.dispensar()
        return recarregar()
      })
      .catch(() => {
        /* sem rede ou o banco recusou: fica "Pessoa N" e tenta de novo na próxima abertura */
      })
  }, [api, familia, resumo, recarregar])
}
