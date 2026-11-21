import { textoPrivado } from '../lib/olho'
import './apoio-f32.css'
import { Bemvindo } from './ilustracoes'
import { Icone } from './Icone'
import { useState } from 'react'
import { useApp } from '../app/contexto'
import { temAcolhimento, encerrarAcolhimento } from '../lib/acolhimento'
import { NomeDaPessoa } from './NomeDaPessoa'
export function Acolhimento() {
  const { familia, abrirLancar } = useApp()
  const [aberto, setAberto] = useState(temAcolhimento)
  if (!aberto || !familia) return null
  const assessor = familia.papel === 'equipe'
  const fechar = () => {
    encerrarAcolhimento()
    setAberto(false)
  }
  return (
    <section className="card f32-acolhimento" aria-label="Boas-vindas ao convite">
      <Bemvindo />
      <h2>
        Bem-vindo, <NomeDaPessoa pessoa={{ tipo: 'membro', id: familia.membroId || '', nome: familia.membroNome }} />
      </h2>
      <p>Você está na {textoPrivado(familia.nome)}.</p>
      <p>
        {assessor
          ? 'Aqui você vê tarefas e compras da Casa, sem valores em dinheiro.'
          : familia.papel === 'casal'
            ? 'Você acompanha as finanças da família e compartilha a gestão.'
            : 'Aqui você acompanha seu orçamento, seus gastos e desejos.'}
      </p>
      <button
        className="btn primary"
        type="button"
        onClick={() => {
          fechar()
          abrirLancar()
        }}
      >
        <Icone nome="lancar" />
        {assessor ? 'Anotar primeira compra' : 'Anotar primeiro gasto'}
      </button>
      <button className="btn ghost" type="button" onClick={fechar}>
        <Icone nome="abrir" />
        Continuar
      </button>
    </section>
  )
}
