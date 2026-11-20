import './apoio-f32.css'
import { useEffect, useState } from 'react'
import { falhasDeLeitura, limparFalhasDeLeitura, ouvirFalhasDeLeitura } from '../app/falhasDeLeitura'
import { Icone } from './Icone'

/** Junta "a, b e c" do jeito que se fala. */
export function listaFalada(itens: string[]): string {
  if (itens.length <= 1) return itens[0] ?? ''
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`
}

/** Faixa única que diz o que não carregou na tela e deixa tentar de novo. Some ao trocar de tela. */
export function FalhasDeLeitura({ aoTentarDeNovo }: { aoTentarDeNovo: () => void }) {
  const [, redesenhar] = useState(0)

  useEffect(() => {
    const parar = ouvirFalhasDeLeitura(() => redesenhar(n => n + 1))
    addEventListener('hashchange', limparFalhasDeLeitura)
    return () => {
      parar()
      removeEventListener('hashchange', limparFalhasDeLeitura)
    }
  }, [])

  const falhas = falhasDeLeitura()
  if (!falhas.length) return null

  return (
    <div className="todo f32-feedback" role="alert" data-falha-de-leitura>
      Não foi possível carregar {listaFalada(falhas)}. O resto da tela está certo.
      <button
        type="button"
        onClick={() => {
          limparFalhasDeLeitura()
          aoTentarDeNovo()
        }}
      >
        <Icone nome="pendente" />
        Tentar de novo
      </button>
    </div>
  )
}
