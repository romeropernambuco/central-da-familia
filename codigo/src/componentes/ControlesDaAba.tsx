import { useAcoes, useDadosDoDia, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { Icone } from './Icone'

export function SeloDaAba() {
  const { api } = useSessaoAtual()
  const { semRede } = useDadosDoDia()
  const exemplo = api.modo === 'exemplo'
  return (
    <span className={'sync' + (exemplo ? ' ex' : semRede ? ' off' : '')} role="status">
      <Icone nome={exemplo ? 'ajuda' : semRede ? 'erro' : 'salvo'} />
      {exemplo ? 'exemplo' : semRede ? 'Sem internet' : 'Conectado'}
    </span>
  )
}

export function OlhoDaAba({ curto = false }: { curto?: boolean }) {
  const { alternarOculto } = useAcoes()
  const { oculto } = useOlhoApp()
  const rotulo = (oculto ? 'Mostrar' : 'Esconder') + (curto ? ' valores' : ' os valores')
  return (
    <button
      className={curto ? 'iconbtn' : 'iconbtn olho'}
      type="button"
      onClick={alternarOculto}
      aria-pressed={oculto}
      aria-label={rotulo}
      title={rotulo}
    >
      <Icone nome={oculto ? 'olhoFechado' : 'olho'} />
    </button>
  )
}
