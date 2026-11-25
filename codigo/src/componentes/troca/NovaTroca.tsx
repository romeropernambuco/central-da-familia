import { useEffect, useRef, useState } from 'react'
import { useSessaoAtual } from '../../app/contexto'
import { hojeRecife, textoParaValor, valorDigitadoValido } from '../../lib/formato'
import { novoUuid } from '../../lib/seguro'
import type { CotacaoMoeda } from '../../lib/troca/cambio'
import { nomeDaMoeda, simboloDaMoeda } from '../../lib/troca/formato'
import { PAISES, trocaNova } from '../../lib/troca/nova'
import type { PagamentoTroca, Troca } from '../../lib/troca/tipos'
import { Botao, CampoValor, Sheet } from '../base'
import { CampoPrivado } from '../privacidade'
import { CampoNumero } from './partes'

/**
 * Comparação nova em 5 respostas. O câmbio vem do Banco Central na hora; se a busca falhar, a folha pede o câmbio
 * à mão e segue. As formas de pagar vêm da última comparação guardada, para ninguém digitar os cartões de novo.
 */
export function NovaTroca({
  pagamentos,
  criar,
  fechar,
}: {
  pagamentos?: PagamentoTroca[]
  criar: (t: Troca) => void
  fechar: () => void
}) {
  const { api } = useSessaoAtual()
  const [nome, setNome] = useState('')
  const [usado, setUsado] = useState('')
  const [paisId, setPaisId] = useState(PAISES[0].id)
  const [preco, setPreco] = useState<number | null>(null)
  const [venda, setVenda] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [semCambio, setSemCambio] = useState('')
  const [reais, setReais] = useState<number | null>(null)
  const [dolares, setDolares] = useState<number | null>(null)
  const vivo = useRef(true)
  useEffect(() => {
    // liga de novo a cada montagem: no modo de conferência do React o efeito roda, desmonta e roda outra vez
    vivo.current = true
    return () => {
      vivo.current = false
    }
  }, [])
  const pais = PAISES.find(p => p.id === paisId) ?? PAISES[0]
  const numero = (n: number | null): n is number => n != null && Number.isFinite(n) && n > 0
  const vendaCerta = venda === '' || valorDigitadoValido(venda)
  const pronto = nome.trim() !== '' && numero(preco) && vendaCerta && (!semCambio || (numero(reais) && numero(dolares)))
  const montar = (cotacao: CotacaoMoeda) =>
    criar(
      trocaNova({
        id: novoUuid(),
        nome: nome.trim(),
        usado: usado.trim(),
        pais,
        preco: preco as number,
        venda: textoParaValor(venda),
        cotacao,
        pagamentos,
      }),
    )
  const continuar = async () => {
    if (!pronto) return
    if (semCambio) return montar({ moeda: pais.moeda, reais: reais as number, dolares: dolares as number, data: '' })
    setBuscando(true)
    try {
      if (!api.cotacaoMoeda) throw new Error('Digite o câmbio de hoje para continuar.')
      const cotacao = await api.cotacaoMoeda(pais.moeda, hojeRecife())
      if (vivo.current) montar(cotacao)
    } catch (e) {
      if (vivo.current) setSemCambio((e as Error).message)
    } finally {
      if (vivo.current) setBuscando(false)
    }
  }
  const moeda = nomeDaMoeda(pais.moeda)
  return (
    <Sheet titulo="Nova comparação" fechar={fechar} subtitulo="O câmbio de hoje entra sozinho">
      <div className="troca-campos">
        <label className="campo">
          <span>O que você quer comprar lá fora</span>
          <CampoPrivado className="inp" value={nome} maxLength={100} onChange={e => setNome(e.target.value)} />
        </label>
        <label className="campo">
          <span>O que você vende aqui para trocar</span>
          <CampoPrivado className="inp" value={usado} maxLength={100} onChange={e => setUsado(e.target.value)} />
          <small>Pode ficar vazio se não vai vender nada.</small>
        </label>
        <label className="campo">
          <span>Onde vai comprar</span>
          <select
            className="inp"
            value={paisId}
            onChange={e => {
              setPaisId(e.target.value)
              setSemCambio('')
            }}
          >
            {PAISES.map(p => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <small>
            {pais.reembolsoPct > 0
              ? `Tax free: costuma voltar cerca de ${String(pais.reembolsoPct).replace('.', ',')}% do preço (estimativa).`
              : 'Este país não devolve imposto a turista na saída.'}
          </small>
        </label>
        <CampoNumero rotulo={`Preço na loja (${simboloDaMoeda(pais.moeda)})`} valor={preco} mudar={setPreco} opcional />
        <div className="campo">
          <span>Por quanto espera vender o usado</span>
          <CampoValor rotulo="Venda esperada do usado em reais" valor={venda} mudar={setVenda} />
        </div>
        {semCambio && (
          <>
            <p className="todo warn" role="alert">
              {semCambio}
            </p>
            <div className="troca-dupla">
              <CampoNumero rotulo={`R$ por ${moeda}`} valor={reais} mudar={setReais} opcional />
              <CampoNumero rotulo={`US$ por ${moeda}`} valor={dolares} mudar={setDolares} opcional />
            </div>
          </>
        )}
        <Botao variante="primario" className="full" carregando={buscando} disabled={!pronto} onClick={continuar}>
          Montar a comparação
        </Botao>
      </div>
    </Sheet>
  )
}
