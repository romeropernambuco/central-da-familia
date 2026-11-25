import { useMemo, useState } from 'react'
import { ArrowRight, Link2, Plus, Trash2 } from 'lucide-react'
import { useAcoes, useSessaoAtual } from '../../app/contexto'
import { useConfig } from '../../app/useConfig'
import { useOculto } from '../../app/useOculto'
import { Botao, EstadoVazio } from '../../componentes/base'
import { Carregando } from '../../componentes/Carregando'
import { Icone } from '../../componentes/Icone'
import { NovaTroca } from '../../componentes/troca/NovaTroca'
import { TrocaAjustes } from '../../componentes/troca/TrocaAjustes'
import { TrocaContaEmMoeda, TrocaDetalhe } from '../../componentes/troca/TrocaDetalhe'
import { TrocaNaLoja, TrocaRegras, TrocaVenda } from '../../componentes/troca/TrocaGuia'
import { TrocaPagamento } from '../../componentes/troca/TrocaPagamento'
import { TrocaResumo } from '../../componentes/troca/TrocaResumo'
import '../../componentes/troca/troca.css'
import { copiarProtegido, textoPrivado } from '../../lib/olho'
import { contaDaTroca, erroDaTroca } from '../../lib/troca/conta'
import { diaCurto } from '../../lib/troca/formato'
import { lerTrocas } from '../../lib/troca/ler'
import { trocaDoLink, trocaParaLink } from '../../lib/troca/link'
import type { Troca } from '../../lib/troca/tipos'

/** Comparação que chegou no endereço (#/trocar?c=...). Lida uma vez, ao abrir a tela. */
const doEndereco = () => (typeof location === 'undefined' ? null : trocaDoLink(location.hash))

/**
 * As comparações guardadas, a que está aberta e os rascunhos. Mexer num campo não grava: fica num rascunho daquela
 * comparação até a pessoa guardar ou desfazer, então trocar de comparação não perde o que foi digitado.
 */
function useTrocas() {
  const { toast } = useAcoes()
  const [cru, salvar, falha, lido] = useConfig<unknown[]>('trocas', [])
  const guardadas = useMemo(() => lerTrocas(cru), [cru])
  const [recebida] = useState(doEndereco)
  const [rascunhos, setRascunhos] = useState<Record<string, Troca>>(() => (recebida ? { [recebida.id]: recebida } : {}))
  const [aberta, setAberta] = useState<string | null>(recebida?.id ?? null)
  const novas = Object.values(rascunhos).filter(r => !guardadas.some(g => g.id === r.id))
  const todas = [...guardadas, ...novas]
  const guardada = guardadas.find(g => g.id === aberta) ?? (aberta && rascunhos[aberta] ? undefined : guardadas[0])
  const id = aberta && todas.some(x => x.id === aberta) ? aberta : (guardada?.id ?? null)
  const atual = id ? (rascunhos[id] ?? guardada ?? null) : null
  const semRascunho = (qual: string) =>
    setRascunhos(r => Object.fromEntries(Object.entries(r).filter(([k]) => k !== qual)))
  return {
    falha,
    lido,
    todas,
    atual,
    guardadas,
    mexida: !!atual && !!rascunhos[atual.id],
    nova: !!atual && !guardadas.some(g => g.id === atual.id),
    doLink: !!atual && recebida?.id === atual.id && !guardadas.some(g => g.id === atual.id),
    abrir: setAberta,
    mudar: (parte: Partial<Troca>) => atual && setRascunhos(r => ({ ...r, [atual.id]: { ...atual, ...parte } })),
    criar: (t: Troca) => {
      setRascunhos(r => ({ ...r, [t.id]: t }))
      setAberta(t.id)
    },
    desfazer: () => atual && semRascunho(atual.id),
    guardar: async () => {
      if (!atual) return
      const existe = guardadas.some(g => g.id === atual.id)
      const lista = existe ? guardadas.map(g => (g.id === atual.id ? atual : g)) : [...guardadas, atual]
      if (await salvar(lista)) {
        semRascunho(atual.id)
        toast('Comparação guardada.')
      }
    },
    tirar: async () => {
      if (!atual) return
      const antes = guardadas
      semRascunho(atual.id)
      setAberta(null)
      if (!antes.some(g => g.id === atual.id)) return
      if (await salvar(antes.filter(g => g.id !== atual.id)))
        toast('Comparação tirada.', async () => {
          await salvar(antes)
        })
    },
  }
}

type Trocas = ReturnType<typeof useTrocas>

/** As comparações em pílulas, o nome da aberta e o aviso de que há mudança por guardar. */
function Topo({ trocas, t, erro, nova }: { trocas: Trocas; t: Troca; erro: string; nova: () => void }) {
  const oculto = useOculto()
  return (
    <header className="troca-topo">
      <div className="pills" role="group" aria-label="Comparações">
        {trocas.todas.map(x => (
          <button
            key={x.id}
            className="pill"
            type="button"
            aria-pressed={x.id === t.id}
            onClick={() => trocas.abrir(x.id)}
          >
            {textoPrivado(x.nome, oculto)}
          </button>
        ))}
        <button className="pill" type="button" onClick={nova}>
          <Icone desenho={Plus} aria-hidden="true" />
          Nova
        </button>
      </div>
      <div>
        <h2>{textoPrivado(t.nome, oculto)}</h2>
        <p className="sub troca-rota">
          <span>
            {t.usado ? `Quanto custa trocar o ${textoPrivado(t.usado, oculto)}` : 'Quanto custa comprar lá fora'}
          </span>
          <span>
            <b>{t.de}</b>
            <Icone desenho={ArrowRight} size={16} rotulo="para" />
            <b>{t.para}</b>
            {t.cambioData && ` · câmbio de ${diaCurto(t.cambioData)}`}
          </span>
        </p>
      </div>
      {trocas.mexida && (
        <div className="todo troca-guardar" role="status">
          <span>
            {trocas.doLink
              ? 'Comparação recebida por link. Confira os números e guarde.'
              : trocas.nova
                ? 'Comparação nova, ainda não guardada.'
                : 'Você mudou esta comparação.'}
          </span>
          <span className="row-btns">
            <Botao variante="primario" className="sm" disabled={!!erro} onClick={trocas.guardar}>
              Guardar
            </Botao>
            {!trocas.nova && (
              <Botao variante="secundario" className="sm" onClick={trocas.desfazer}>
                Desfazer mudanças
              </Botao>
            )}
          </span>
        </div>
      )}
    </header>
  )
}

/** Copiar o link e tirar a comparação. Tirar pede um segundo toque, e ainda dá para desfazer no aviso. */
function Rodape({ t, tirar }: { t: Troca; tirar: () => void }) {
  const { toast } = useAcoes()
  const [tirando, setTirando] = useState(false)
  const copiarLink = () =>
    copiarProtegido(`${location.origin}${location.pathname}#/trocar?${trocaParaLink(t)}`, undefined, toast).then(
      ok => ok && toast('Link copiado.'),
    )
  return (
    <div className="troca-rodape">
      <Botao variante="secundario" onClick={copiarLink}>
        <Icone desenho={Link2} aria-hidden="true" />
        Copiar o link desta comparação
      </Botao>
      <Botao
        variante="perigo"
        className={tirando ? 'on' : ''}
        onClick={() => {
          if (tirando) tirar()
          setTirando(!tirando)
        }}
      >
        <Icone desenho={Trash2} aria-hidden="true" />
        {tirando ? 'Confirmar: tirar esta comparação' : 'Tirar esta comparação'}
      </Botao>
    </div>
  )
}

/** Trocar lá fora: quanto custa comprar um aparelho novo no exterior vendendo o usado aqui. Só o casal vê. */
export function Trocar() {
  const { familia } = useSessaoAtual()
  const { recarregar } = useAcoes()
  const trocas = useTrocas()
  const [nova, setNova] = useState(false)
  if (familia?.papel !== 'casal') return null
  if (trocas.falha)
    return (
      <p className="todo warn" role="alert">
        {trocas.falha}
        <button className="lnk" type="button" onClick={() => recarregar()}>
          Tentar de novo
        </button>
      </p>
    )
  if (!trocas.lido) return <Carregando />
  const t = trocas.atual
  const folhaNova = nova && (
    <NovaTroca
      pagamentos={trocas.guardadas.at(-1)?.pagamentos}
      fechar={() => setNova(false)}
      criar={criada => {
        trocas.criar(criada)
        setNova(false)
      }}
    />
  )
  if (!t)
    return (
      <div className="view">
        <EstadoVazio
          acao={
            <Botao variante="primario" onClick={() => setNova(true)}>
              Nova comparação
            </Botao>
          }
        >
          Compare quanto custa trocar um aparelho comprando fora do Brasil e vendendo o usado aqui.
        </EstadoVazio>
        {folhaNova}
      </div>
    )
  const erro = erroDaTroca(t)
  const bloco = { t, conta: contaDaTroca(t), mudar: trocas.mudar }
  return (
    <div className="view troca">
      <Topo trocas={trocas} t={t} erro={erro} nova={() => setNova(true)} />
      <div className="tela-larga">
        <div className="col">
          <TrocaResumo {...bloco} erro={erro} />
          <TrocaPagamento {...bloco} />
          <TrocaDetalhe {...bloco} />
          <TrocaContaEmMoeda {...bloco} />
        </div>
        <div className="col">
          <TrocaVenda t={t} />
          <TrocaNaLoja t={t} />
          <TrocaAjustes {...bloco} restaurar={trocas.mexida && !trocas.nova ? trocas.desfazer : undefined} />
          <TrocaRegras t={t} />
        </div>
      </div>
      <Rodape key={t.id} t={t} tirar={trocas.tirar} />
      {folhaNova}
    </div>
  )
}
