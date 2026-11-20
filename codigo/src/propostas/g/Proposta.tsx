import { useId, useState } from 'react'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/fraunces'
import { Icone } from '../../componentes/Icone'
import { AssessorDaCasa, Plano2029, SemGastos, TudoEmDia } from '../../componentes/ilustracoes'
import type { PropsProposta } from '../Propostas'
import { Valor } from '../comuns/privacidade'
import { DetalheCasa, niveis, ordemAlertas, type Destino } from './DetalheCasa'
import { Cena, comodos, ValorPlaca } from './Cena'
import './casa-viva.css'

export function Proposta({ dados, tema, dispositivo }: PropsProposta) {
  const [destino, abrir] = useState<Destino | null>(null)
  const id = useId()
  const pessoa = dados.pessoa.nome.valor?.trim().split(/\s+/)[0]
  const saudacao = dados.saudacao.valor || 'Olá'
  const papel = dados.pessoa.papel.valor

  if (papel !== 'casal')
    return (
      <div className="casa-viva" data-cv-tema={tema} data-cv-dispositivo={dispositivo}>
        <div className="casa-viva-acolhida">
          <span className="selo-exemplo">Exemplo</span>
          <h1>
            {saudacao}
            {pessoa ? `, ${pessoa}` : ''}!
          </h1>
          {papel === 'equipe' ? (
            <>
              <AssessorDaCasa />
              <p>Sua rotina de compras, estoque e presença está na Casa.</p>
              <a className="cv-alvo cv-acao" href="../../#/casa">
                Abrir Casa <Icone nome="abrir" size={16} />
              </a>
            </>
          ) : papel === 'pessoa' ? (
            <>
              <SemGastos />
              <p>Hoje você pode gastar</p>
              <Valor campo={dados.hojePodeGastar.valor} className="numero-principal" />
            </>
          ) : (
            <p>Seu acesso ainda está indisponível.</p>
          )}
        </div>
      </div>
    )

  const alerta = ordemAlertas(dados.alertas.valor ?? [])[0]
  const nivel = alerta && niveis[alerta.nivel]
  const estadoSaude =
    nivel?.saude ?? (dados.alertas.estado === 'indisponivel' ? 'Avisos indisponíveis' : 'Tudo em ordem')
  const textoFila = nivel
    ? 'Veja o que a equipe precisa de você.'
    : dados.alertas.estado === 'indisponivel'
      ? 'A fila está indisponível.'
      : 'Nenhum aviso na fila.'
  const menu = (
    <nav className="cv-nav" aria-label="Áreas da família">
      {comodos.map(c => (
        <button className="cv-alvo" type="button" key={c.id} aria-haspopup="dialog" onClick={() => abrir(c.id)}>
          <Icone nome={c.icone} size={19} /> {c.area}
        </button>
      ))}
      <button className="cv-alvo" type="button" aria-haspopup="dialog" onClick={() => abrir('mais')}>
        <Icone nome="mais" size={19} /> Mais
      </button>
    </nav>
  )

  return (
    <div className="casa-viva" data-cv-tema={tema} data-cv-dispositivo={dispositivo}>
      <div className="cv-layout">
        <header className="cv-cabecalho">
          <div className="cv-identidade">
            <Icone nome="inicio" size={17} /> Casa Viva <span className="selo-exemplo">Exemplo</span>
          </div>
          <h1>
            {saudacao}
            {pessoa ? `, ${pessoa}` : ''}!
          </h1>
        </header>
        {dispositivo === 'desktop' && menu}

        <div className="cv-corpo">
          <section className="cv-saude" aria-label="Saúde da casa">
            <span className="cv-saude-icone" data-risco={alerta?.nivel === 'dinheiro em risco'}>
              <Icone nome={nivel?.icone ?? 'painel'} size={19} />
            </span>
            <div>
              <p>Saúde da casa</p>
              <strong>{estadoSaude}</strong>
            </div>
            <button
              type="button"
              className="cv-alvo cv-acao"
              aria-haspopup="dialog"
              onClick={() => abrir('pendencias')}
            >
              Ver avisos <Icone nome="abrir" size={15} />
            </button>
          </section>

          <section className="cv-planta" aria-labelledby={id + '-planta'}>
            <div className="cv-planta-cabecalho">
              <h2 id={id + '-planta'}>Por dentro da casa</h2>
              <p>Escolha um cômodo para entrar.</p>
            </div>
            <div className="cv-mapa">
              <Cena
                dados={dados}
                aoTocar={sala => {
                  document.getElementById(id + '-' + sala)?.focus({ preventScroll: true })
                  abrir(sala)
                }}
              />
              {comodos.map(c => (
                <button
                  key={c.id}
                  type="button"
                  className="cv-alvo cv-placa"
                  data-comodo={c.id}
                  id={id + '-' + c.id}
                  aria-haspopup="dialog"
                  onClick={() => abrir(c.id)}
                >
                  <span className="cv-placa-area">
                    <Icone nome={c.icone} size={16} /> {c.area} <Icone nome="abrir" size={15} />
                  </span>
                  <strong>{c.nome}</strong>
                  <span className="cv-legenda">{c.legenda}</span>
                  <ValorPlaca campo={c.ler(dados)} />
                </button>
              ))}
            </div>
          </section>

          <section className="cv-resumo" aria-label="Resumos da família">
            <article className="cv-cartao">
              <SemGastos />
              <h2>Hoje você pode gastar</h2>
              <Valor campo={dados.hojePodeGastar.valor} className="numero-principal" />
            </article>
            <article className="cv-cartao">
              <Plano2029 />
              <h2>Plano 2029</h2>
              <Valor campo={dados.plano2029.faltamPorMesComMargem} className="numero-secundario" />
              <p>Falta estimada por mês, com margem.</p>
              <button type="button" className="cv-alvo cv-link" aria-haspopup="dialog" onClick={() => abrir('plano')}>
                Ver Plano 2029 <Icone nome="abrir" size={15} />
              </button>
            </article>
            <article className="cv-cartao">
              <TudoEmDia />
              <h2>Precisa de você</h2>
              <p>{textoFila}</p>
              <button
                type="button"
                className="cv-alvo cv-link"
                aria-haspopup="dialog"
                onClick={() => abrir('pendencias')}
              >
                Ver pendências <Icone nome="abrir" size={15} />
              </button>
            </article>
          </section>
        </div>

        {dispositivo === 'celular' && menu}
      </div>
      {destino && <DetalheCasa dados={dados} destino={destino} abrir={abrir} fechar={() => abrir(null)} />}
    </div>
  )
}
