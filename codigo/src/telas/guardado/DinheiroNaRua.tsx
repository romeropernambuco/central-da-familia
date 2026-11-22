import { useState } from 'react'
import { HandCoins, Plus } from 'lucide-react'
import type { GuardadoAplicacao } from '../../api/tipos'
import { useNegocios } from '../../app/useCadernos'
import { useOculto } from '../../app/useOculto'
import { Botao, Din } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { hojeRecife, reais } from '../../lib/formato'
import { textoPrivado } from '../../lib/olho'
import { contaDoNegocio, fraseDoPrazo, ordenarNegocios, totaisNaRua, type Negocio } from '../../lib/dinheiroNaRua'
import { FolhaNegocio } from './FolhaNegocio'
import { NovoNegocio } from './NovoNegocio'
import './dinheiro-na-rua.css'
import '../../componentes/planilha.css'

const plural = (n: number, um: string, varios: string) => (n === 1 ? `1 ${um}` : `${n} ${varios}`)

/**
 * Dinheiro na rua: o que saiu da conta para um negócio e tem que voltar (carro para revender, baia de porcos...).
 * Só o casal vê (a tela do Guardado já é só do casal, e o banco só entrega esta configuração ao casal).
 * Não entra no total guardado nem no plano de 2029 enquanto não volta.
 */
export function DinheiroNaRua({ taxaAno, aplicacoes }: { taxaAno: number; aplicacoes: GuardadoAplicacao[] }) {
  const oculto = useOculto()
  const { negocios: lidos, salvar: salvarUm, apagar, voltaGuardar, falha, lido } = useNegocios()
  const [aberto, setAberto] = useState<string | null>(null)
  const [folha, setFolha] = useState<Negocio | 'novo' | null>(null)
  const hoje = hojeRecife()
  const negocios = ordenarNegocios(lidos)
  const t = totaisNaRua(negocios, hoje, taxaAno)
  const noFoco = negocios.find(n => n.id === aberto)
  const linha = (n: Negocio) => {
    const c = contaDoNegocio(n, hoje, taxaAno)
    return (
      <li key={n.id}>
        <button
          className="li"
          type="button"
          onClick={() => setAberto(n.id)}
          aria-label={`${textoPrivado(n.nome, oculto)}: ${n.encerrado_em ? 'resultado' : 'falta voltar'} ${reais(n.encerrado_em ? c.resultado : c.na_rua)}, ${textoPrivado(fraseDoPrazo(c), oculto)}. Abrir.`}
        >
          <span className="tile">
            <Icone desenho={HandCoins} />
          </span>
          <span className="m">
            <b>{textoPrivado(n.nome, oculto)}</b>
            <small className={c.situacao === 'atrasado' ? 'passa' : ''}>
              {textoPrivado(
                [n.com_quem ? `com ${n.com_quem}` : '', fraseDoPrazo(c)].filter(Boolean).join(' · '),
                oculto,
              )}
            </small>
          </span>
          <span className="v rua-valor">
            <Din v={n.encerrado_em ? c.resultado : c.na_rua} />
            <Icone nome="abrir" className="muted" />
          </span>
        </button>
      </li>
    )
  }
  const abertos = negocios.filter(n => !n.encerrado_em),
    encerrados = negocios.filter(n => n.encerrado_em)
  return (
    <section className="card dinheiro-na-rua" aria-labelledby="ruaTitulo" data-secao="dinheiro-na-rua">
      <div className="card-h">
        <h2 id="ruaTitulo">
          <Icone desenho={HandCoins} />
          Dinheiro na rua
        </h2>
        {lido && (
          <button className="lnk" type="button" onClick={() => setFolha('novo')}>
            <Icone desenho={Plus} />
            Novo negócio
          </button>
        )}
      </div>
      <p className="sub">O que saiu para um negócio e tem que voltar.</p>
      <details className="salario-porque">
        <summary>Por quê?</summary>
        <p className="sub">Enquanto não volta, esse dinheiro fica fora do total guardado e do plano de 2029.</p>
      </details>
      {falha && (
        <p className="erro" role="alert">
          {textoPrivado(falha)}
        </p>
      )}
      {!lido && !falha && <p className="sub">Buscando os negócios…</p>}
      {lido && !negocios.length && (
        <Botao variante="secundario" type="button" onClick={() => setFolha('novo')}>
          <Icone desenho={Plus} />
          Anotar o primeiro negócio
        </Botao>
      )}
      {abertos.length > 0 && (
        <>
          <h3 className="lbl">Falta voltar</h3>
          <div className="numrow">
            <Din v={t.na_rua} tam="big" />
          </div>
          <p className={'apoio' + (t.atrasados ? ' passa' : '')}>
            {plural(t.abertos, 'negócio aberto', 'negócios abertos')}
            {t.atrasados ? ` · ${plural(t.atrasados, 'com o prazo vencido', 'com o prazo vencido')}` : ''}
          </p>
          <ul className="list">{abertos.map(linha)}</ul>
        </>
      )}
      {encerrados.length > 0 && (
        <details className="rua-encerrados">
          <summary>Encerrados ({encerrados.length}): o que deu de resultado</summary>
          <ul className="list">{encerrados.map(linha)}</ul>
        </details>
      )}
      {noFoco && (
        <FolhaNegocio
          n={noFoco}
          taxaAno={taxaAno}
          aplicacoes={aplicacoes}
          salvar={salvarUm}
          voltaGuardar={voltaGuardar}
          fechar={() => setAberto(null)}
          mudar={() => {
            setFolha(noFoco)
            setAberto(null)
          }}
        />
      )}
      {folha && (
        <NovoNegocio
          atual={folha === 'novo' ? null : folha}
          salvar={salvarUm}
          apagar={apagar}
          fechar={() => setFolha(null)}
        />
      )}
    </section>
  )
}
