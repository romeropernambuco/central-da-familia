import { textoPrivado } from '../lib/olho'
import { EstadoVazio } from './EstadoVazio'
import { Icone } from './Icone'
import { useState } from 'react'
import { useAcoes, useOlhoApp, useSessaoAtual } from '../app/contexto'
import { frescor, type GrupoNumero, type useNumerosAtualizados } from '../app/useNumerosAtualizados'
import type { FuturoEntrada } from '../lib/futuro'
import { Din, Sheet } from './base'
import { FolhaImovel } from './Imoveis'
import type { ImovelTela } from '../api/tipos'

export interface NumeroParaConferir {
  grupo: GrupoNumero
  id: string
  nome: string
  valor: number
  href?: string
  ajuda: string
}
export function numerosParaConferir(e: FuturoEntrada): NumeroParaConferir[] {
  return [
    ...e.aplicacoes.map(a => ({
      grupo: 'aplicacoes' as const,
      id: a.id,
      nome: a.banco || 'Aplicação',
      valor: a.saldo,
      href: '#/escritorio?f=guardado',
      ajuda: 'O Gestor oferece a conferência do saldo na virada do mês. A tela Guardado permite aportes e resgates.',
    })),
    {
      grupo: 'saldo_caixa',
      id: '',
      nome: 'Saldo em conta',
      valor: e.saldo_caixa,
      ajuda:
        'Ainda não há formulário de edição do saldo em conta neste app. Conferir aqui registra só a data; não altera o saldo.',
    },
    ...(e.imoveis ?? []).map(i => ({
      grupo: 'imoveis' as const,
      id: i.id,
      nome: i.apelido,
      valor: i.valor,
      ajuda: 'Valor estimado do imóvel. A folha existente abre para ver ou editar, conforme o titular.',
    })),
    ...e.recebimentos
      .filter(r => !r.recebido)
      .map(r => ({
        grupo: 'recebimentos' as const,
        id: r.id,
        nome: r.descricao || 'Recebimento previsto',
        valor: r.valor,
        href: '#/planejamento?numeros=recebimentos',
        ajuda:
          'Em Recebimentos com data, o dono pode mudar mês e certeza. O formulário atual não permite editar o valor.',
      })),
  ]
}

export function AtualizarNumeros({
  itens,
  conferencia,
  fechar,
  agora = () => new Date(),
}: {
  itens: NumeroParaConferir[]
  conferencia: ReturnType<typeof useNumerosAtualizados>
  fechar: () => void
  agora?: () => Date
}) {
  const { api, familia } = useSessaoAtual()
  const { tentar } = useAcoes()
  const { oculto } = useOlhoApp()
  const [ocupado, setOcupado] = useState(''),
    [aviso, setAviso] = useState('')
  const [imovel, setImovel] = useState<ImovelTela | null>(null)
  if (familia?.papel !== 'casal') return null
  if (imovel)
    return (
      <FolhaImovel
        inicial={imovel}
        fechar={() => setImovel(null)}
        tirar={async i => {
          if (api.imovelTirar && (await tentar(() => api.imovelTirar!(familia.id, i.id)))) {
            setImovel(null)
            fechar()
          }
        }}
        salvar={async (id, dados) => {
          if (!api.imovelSalvar) return false
          const ok = await tentar(() => api.imovelSalvar!(familia.id, id, dados))
          if (ok) {
            setAviso('Imóvel salvo. Confira abaixo a data de conferência.')
            fechar()
          }
          return ok
        }}
      />
    )
  return (
    <Sheet titulo="Atualizar meus números" fechar={fechar}>
      <p className="sub">
        Confira no banco, no contrato ou na sua avaliação. Marcar como conferido muda apenas a data.
      </p>
      {api.modo === 'exemplo' && <p className="todo">Exemplo: conferências ficam só nesta demonstração.</p>}
      {(conferencia.erro || aviso) && <p role="status">{conferencia.erro || aviso}</p>}
      <div className="f30-conferencia">
        {!itens.length && (
          <EstadoVazio
            ilustracao="TudoEmDia"
            titulo="Tudo pronto por aqui"
            frase="Nenhum número para conferir agora."
          />
        )}
        <ul className="rumo-conferencia">
          {itens.map(item => {
            const chave = `${item.grupo}:${item.id}`
            const data =
              item.grupo === 'saldo_caixa' ? conferencia.dados.saldo_caixa : conferencia.dados[item.grupo][item.id]
            const estado = frescor(data, agora())
            return (
              <li key={chave}>
                <div className="rumo-entre">
                  <span className="icone-chip">
                    <Icone
                      nome={
                        item.grupo === 'imoveis' ? 'imovel' : item.grupo === 'recebimentos' ? 'entrada' : 'guardado'
                      }
                    />
                  </span>
                  <b>{textoPrivado(item.nome, oculto)}</b>
                  <Din v={item.valor / 100} />
                </div>
                <p className={`rumo-frescor ${oculto ? '' : estado.cor}`}>{textoPrivado(estado.texto, oculto)}</p>
                <p className="sub">{item.ajuda}</p>
                <div className="row-btns">
                  {item.href && (
                    <a className="btn line" href={item.href} onClick={fechar}>
                      {item.grupo === 'aplicacoes' ? 'Abrir Gestor do Guardado' : 'Abrir recebimentos com data'}
                    </a>
                  )}
                  {item.grupo === 'imoveis' && (
                    <button
                      className="btn line"
                      type="button"
                      disabled={!!ocupado || !api.imoveis}
                      onClick={async () => {
                        setOcupado(chave)
                        await tentar(async () => {
                          const lista = await api.imoveis!(familia.id),
                            existente = lista.find(i => i.id === item.id)
                          if (!existente) throw new Error('Não encontrei esse imóvel. Reabra a lista para atualizar.')
                          setImovel(existente)
                        })
                        setOcupado('')
                      }}
                    >
                      <Icone nome="abrir" />
                      Abrir imóvel
                    </button>
                  )}
                  <button
                    className="btn line"
                    type="button"
                    disabled={!!ocupado || !conferencia.lido}
                    onClick={async () => {
                      if (ocupado) return
                      setOcupado(chave)
                      setAviso('')
                      const ok = await conferencia.marcar(item.grupo, item.id)
                      if (ok) setAviso('Conferência registrada para hoje.')
                      setOcupado('')
                    }}
                  >
                    Marcar como conferido hoje<span className="sr">: {textoPrivado(item.nome, oculto)}</span>
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </Sheet>
  )
}
