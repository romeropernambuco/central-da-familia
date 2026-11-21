import './apoio-f32.css'
import { useEffect, useState } from 'react'
import { pendentes } from '../api/pendentes'
import { donoDosPendentes, ouvirGuardados, recusadosGuardados, tirarPendente } from '../api/pendentesGuardados'
import type { NovoLancamento } from '../api/tipos'
import { reais } from '../lib/formato'
import { Icone } from './Icone'
import { textoPrivado } from './privacidade'

const INTERVALO_DE_NOVA_TENTATIVA_MS = 5000

/**
 * Faixa de envios: o que ainda está tentando salvar e o que o banco recusou num reenvio automático.
 * Recebe a ação de reenviar por propriedade (quem monta é o próprio contexto do app; importar o contexto aqui criaria um ciclo).
 */
export function FilaPendentes({ aoTentarDeNovo }: { aoTentarDeNovo?: (gasto: NovoLancamento) => void }) {
  const [, redesenhar] = useState(0)

  useEffect(() => {
    const atualizar = () => redesenhar(n => n + 1)
    const repetir = () => void pendentes.repetir()
    const pararFila = pendentes.ouvir(atualizar)
    const pararGuardados = ouvirGuardados(atualizar)
    const relogio = setInterval(repetir, INTERVALO_DE_NOVA_TENTATIVA_MS)
    addEventListener('online', repetir)
    return () => {
      pararFila()
      pararGuardados()
      clearInterval(relogio)
      removeEventListener('online', repetir)
    }
  }, [])

  const emEspera = pendentes.itens.size
  const recusados = recusadosGuardados(donoDosPendentes())
  if (!emEspera && !recusados.length) return null

  return (
    <>
      {emEspera > 0 && (
        <div className="todo f32-feedback" role="status">
          Não foi possível salvar ainda. {emEspera} {emEspera === 1 ? 'pendente' : 'pendentes'}, tentando de novo. O
          gasto não se perde se você fechar o app.
          <button type="button" onClick={() => void pendentes.repetir()}>
            <Icone nome="pendente" />
            Tentar agora
          </button>
        </div>
      )}
      {recusados.map(({ dados, erro }) => (
        <div className="todo f32-feedback" role="alert" key={dados.chave} data-recusado={dados.chave}>
          Um gasto guardado neste aparelho não foi aceito: {textoPrivado(dados.descricao || 'sem descrição')},{' '}
          {reais(dados.valor)}. {erro}
          <button type="button" onClick={() => aoTentarDeNovo?.(dados)}>
            <Icone nome="pendente" />
            Tentar de novo
          </button>
          <button type="button" onClick={() => tirarPendente(dados.chave)}>
            Descartar
          </button>
        </div>
      ))}
    </>
  )
}
