import './apoio-f32.css'
import { EstadoVazioVisual } from './EstadoVazioVisual'
import { Erro } from './ilustracoes/figuras'
import { Component, type ReactNode } from 'react'
import { textoDaFalha } from '../falha'
import { Marca } from './Marca'
/** Sem animação: respeita movimento reduzido sem depender de JavaScript/CSS baixado. */
export function Carregando() {
 return <div className="abertura carregando-rota f32-carga" role="status" aria-live="polite"><Marca size={48} /><b>Central da Família</b><p>Abrindo a Central da Família...</p></div>
}

/** Também cobre falhas de download de uma rota lazy depois da abertura. */
export class ProtecaoCarga extends Component<{ children: ReactNode }, { erro: unknown }> {
 state = { erro: null as unknown }
 static getDerivedStateFromError(erro: unknown) { return { erro } }
 render() {
  if (!this.state.erro) return this.props.children
  const falha = textoDaFalha(this.state.erro)
  return <div className="abertura" role="alert"><EstadoVazioVisual ilustracao={<Erro />} titulo={falha.titulo} frase={falha.texto} acao={{ texto: 'Tentar de novo', aoClicar: () => location.reload() }} /></div>
 }
}
