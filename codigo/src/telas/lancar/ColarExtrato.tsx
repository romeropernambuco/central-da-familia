import { useMemo, useState } from 'react'
import { ClipboardPaste, FileText } from 'lucide-react'
import type { Envelope, Lancamento } from '../../api/tipos'
import { FICOU_ESPERANDO } from '../../api/pendentes'
import { enviarSemPrenderATela } from '../../app/envioGuardado'
import { useAcoes, useDadosDoDia, useSessaoAtual } from '../../app/contexto'
import { useOculto } from '../../app/useOculto'
import { Botao, Din, Sheet } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { escreveNo } from '../../lib/dono'
import { jaAnotado, lerExtrato, sugerirLimite, type LinhaExtrato } from '../../lib/extrato'
import { centavos, dataCurta, hojeRecife, reais } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { novoUuid, umaPorVez } from '../../lib/seguro'
import './extrato.css'

/** Cada gasto lido, já com o limite sugerido, a chave do envio (não grava 2 vezes) e se vai ser salvo. */
export interface GastoDoExtrato extends LinhaExtrato {
  chave: string
  envelope: string
  marcado: boolean
  repetido: boolean
  /** vazio = ainda não foi; 'ok' = salvo; texto = o motivo de não ter salvo */
  situacao: '' | 'ok' | string
}

const EXEMPLO = `20/11 Padaria Pão Quente -12,50
20/11 Pix recebido Maria 300,00
21/11 Posto Shell R$ 210,00 D
21/11 Farmácia São João -45,90
22/11 Mercado Bom Preço -145,30`

/** Prepara a lista para conferir: só os gastos, com limite sugerido e o que parece já anotado desmarcado. */
export function prepararGastos(
  linhas: LinhaExtrato[],
  anotados: Lancamento[],
  envs: Envelope[],
  padrao: string,
): GastoDoExtrato[] {
  const permitidos = envs.map(e => e.id)
  return linhas
    .filter(l => !l.entrada)
    .map(l => {
      const repetido = jaAnotado(l, anotados)
      return {
        ...l,
        chave: novoUuid(),
        envelope: sugerirLimite(l.descricao, anotados, permitidos, padrao),
        marcado: !repetido,
        repetido,
        situacao: '',
      }
    })
}

/** Colar extrato: a pessoa cola o que copiou do banco, confere e salva todos os gastos de uma vez. */
export function ColarExtrato({ fechar }: { fechar: () => void }) {
  const { api, familia } = useSessaoAtual()
  const { recarregar, toast } = useAcoes()
  const { resumo } = useDadosDoDia()
  const [texto, setTexto] = useState('')
  const [gastos, setGastos] = useState<GastoDoExtrato[] | null>(null)
  const [entradas, setEntradas] = useState(0)
  const [erro, setErro] = useState('')
  const [lendo, setLendo] = useState(false)
  const [salvando, setSalvando] = useState<{ feito: number; de: number } | null>(null)
  const trava = useMemo(() => umaPorVez((f: () => Promise<void>) => f()), [])
  // os mesmos limites do Anotar: o seu, a Casa e o sem dono
  const envs = (resumo?.envelopes || []).filter(e => escreveNo(e, familia))
  const padrao = envs.find(e => e.id === familia?.envelopeId)?.id || envs[0]?.id || ''

  async function ler(t: string) {
    if (!familia) return
    setErro('')
    const linhas = lerExtrato(t, hojeRecife())
    if (!linhas.length) {
      setErro(
        'Não achei nenhum movimento com data e valor. Copie as linhas do extrato (data, descrição e valor) e cole de novo.',
      )
      return
    }
    setLendo(true)
    // os meses do extrato: serve para achar o que já foi anotado e o limite que a pessoa costuma usar
    const meses = [...new Set([hojeRecife().slice(0, 7), ...linhas.map(l => l.data.slice(0, 7))])].slice(0, 6)
    const anotados = (await Promise.all(meses.map(m => api.lancamentos(familia.id, m).catch(() => [])))).flat()
    setGastos(prepararGastos(linhas, anotados, envs, padrao))
    setEntradas(linhas.filter(l => l.entrada).length)
    setLendo(false)
  }

  const salvar = () =>
    trava(async () => {
      if (!familia || !gastos) return
      const fila = gastos.filter(g => g.marcado && g.situacao !== 'ok')
      let feitos = 0,
        guardados = 0
      setSalvando({ feito: 0, de: fila.length })
      let atual = gastos
      for (const g of fila) {
        let situacao: string = 'ok'
        try {
          const envio = api.lancar({
            familia: familia.id,
            envelope: g.envelope,
            valor: g.valor,
            data: g.data,
            descricao: g.descricao.slice(0, 120),
            chave: g.chave,
          })
          if ((await enviarSemPrenderATela(envio, g.chave)) === FICOU_ESPERANDO) guardados++
          feitos++
        } catch (e) {
          situacao = (e as Error).message
        }
        atual = atual.map(x => (x.chave === g.chave ? { ...x, situacao } : x))
        setGastos(atual)
        setSalvando({ feito: feitos, de: fila.length })
      }
      setSalvando(null)
      await recarregar().catch(() => {})
      const falhou = atual.filter(x => x.marcado && x.situacao && x.situacao !== 'ok').length
      if (!falhou) {
        fechar()
        toast(
          `${feitos === 1 ? '1 gasto anotado' : `${feitos} gastos anotados`} do extrato.` +
            (guardados ? ` ${guardados} ficaram guardados no aparelho e vão quando a internet voltar.` : ''),
        )
      } else
        setErro(
          `${falhou === 1 ? '1 gasto não foi salvo' : `${falhou} gastos não foram salvos`}. Veja o motivo na linha e tente de novo.`,
        )
    })

  return (
    <Sheet titulo="Colar extrato" subtitulo="Os gastos do banco de uma vez" fechar={() => !salvando && fechar()}>
      <div className="colar-extrato">
        {!gastos ? (
          <ColarTexto
            texto={texto}
            mudar={setTexto}
            ler={() => ler(texto)}
            exemplo={api.modo === 'exemplo' ? () => (setTexto(EXEMPLO), ler(EXEMPLO)) : undefined}
            lendo={lendo}
          />
        ) : (
          <ConferirGastos
            gastos={gastos}
            mudar={setGastos}
            envs={envs}
            entradas={entradas}
            salvando={salvando}
            salvar={salvar}
            voltar={() => setGastos(null)}
          />
        )}
        {erro && (
          <p className="erro" role="alert">
            {textoPrivado(erro)}
          </p>
        )}
      </div>
    </Sheet>
  )
}

function ColarTexto(p: {
  texto: string
  mudar: (t: string) => void
  ler: () => void
  exemplo?: () => void
  lendo: boolean
}) {
  const oculto = useOculto()
  return (
    <>
      <p className="sub">
        No app do banco, copie as linhas do extrato ou da fatura e cole aqui. Também serve o arquivo OFX ou a planilha
        CSV aberta como texto. Nada sai do seu celular: a leitura é feita aqui.
      </p>
      <label className="campo">
        <span>Extrato</span>
        <textarea
          className="inp extrato-texto"
          rows={8}
          value={oculto && p.texto ? '' : p.texto}
          readOnly={oculto && !!p.texto}
          placeholder={
            oculto && p.texto ? 'Abra o olho para ver o extrato colado' : '20/11 Padaria -12,50\n21/11 Posto R$ 210,00'
          }
          onChange={e => p.mudar(e.target.value)}
        />
      </label>
      <Botao variante="primario" className="full" type="button" disabled={!p.texto.trim() || p.lendo} onClick={p.ler}>
        <Icone desenho={ClipboardPaste} />
        {p.lendo ? 'Lendo o extrato…' : 'Ler extrato'}
      </Botao>
      {p.exemplo && (
        <Botao variante="fantasma" className="full" type="button" disabled={p.lendo} onClick={p.exemplo}>
          <Icone desenho={FileText} />
          Ver com um extrato de exemplo
        </Botao>
      )}
    </>
  )
}

function ConferirGastos(p: {
  gastos: GastoDoExtrato[]
  mudar: (g: GastoDoExtrato[]) => void
  envs: Envelope[]
  entradas: number
  salvando: { feito: number; de: number } | null
  salvar: () => void
  voltar: () => void
}) {
  const oculto = useOculto()
  const marcados = p.gastos.filter(g => g.marcado && g.situacao !== 'ok')
  const total = centavos(marcados.reduce((s, g) => s + g.valor, 0))
  const troca = (chave: string, campo: Partial<GastoDoExtrato>) =>
    p.mudar(p.gastos.map(g => (g.chave === chave ? { ...g, ...campo } : g)))
  return (
    <>
      <p className="todo">
        <span>
          Confira o limite de cada gasto. Nada foi salvo ainda.
          {p.entradas
            ? ` ${p.entradas === 1 ? '1 entrada ficou de fora' : `${p.entradas} entradas ficaram de fora`}: anote pelo "Entrou dinheiro".`
            : ''}
        </span>
      </p>
      {!p.gastos.length && <p className="sub">Esse extrato só tem entradas. Nenhum gasto para anotar.</p>}
      <ul className="list extrato-lista" aria-label="Gastos lidos do extrato">
        {p.gastos.map(g => (
          <li key={g.chave} className={'extrato-linha' + (g.situacao === 'ok' ? ' salvo' : '')}>
            <label className="check">
              <input
                type="checkbox"
                checked={g.marcado}
                disabled={g.situacao === 'ok' || !!p.salvando}
                onChange={() => troca(g.chave, { marcado: !g.marcado })}
              />
              <span className="m">
                <b>{textoPrivado(g.descricao, oculto)}</b>
                <small>
                  {dataCurta(g.data)}
                  {g.repetido ? ' · parece já anotado' : ''}
                  {g.situacao === 'ok' ? ' · salvo' : g.situacao ? ` · ${textoPrivado(g.situacao, oculto)}` : ''}
                </small>
              </span>
              <span className="v">
                <Din v={g.valor} />
              </span>
            </label>
            <select
              className="inp"
              aria-label={`Limite de ${textoPrivado(g.descricao, oculto)}`}
              value={g.envelope}
              disabled={g.situacao === 'ok' || !!p.salvando}
              onChange={e => troca(g.chave, { envelope: e.target.value })}
            >
              {p.envs.map(e => (
                <option key={e.id} value={e.id}>
                  {textoPrivado(e.nome, oculto)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <Botao
        variante="primario"
        className="full"
        type="button"
        disabled={!marcados.length || !!p.salvando}
        onClick={p.salvar}
      >
        <Icone nome="salvo" />
        {p.salvando
          ? `Salvando ${p.salvando.feito} de ${p.salvando.de}…`
          : marcados.length === 1
            ? `Salvar 1 gasto (${reais(total)})`
            : `Salvar ${marcados.length} gastos (${reais(total)})`}
      </Botao>
      <Botao variante="fantasma" type="button" disabled={!!p.salvando} onClick={p.voltar}>
        Colar outro extrato
      </Botao>
    </>
  )
}
