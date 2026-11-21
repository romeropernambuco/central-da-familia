import { copiarProtegido, textoPrivado } from '../../lib/olho'
import './ajustes.css'
import { EstadoVazio } from '../../componentes/EstadoVazio'
import { Icone } from '../../componentes/Icone'
import { NomeDaPessoa } from '../../componentes/NomeDaPessoa'
import { useMembros } from '../../app/useMembros'
import { ControleFuncionarios } from '../escritorio/AgenteDaAba'
import { CampoPrivado } from '../../componentes/privacidade'
import { useState } from 'react'
import type { ConviteFamilia } from '../../api/tipos'
import {
  MessageCircle,
  Sun,
  Moon,
  Smartphone,
  LogOut,
  ShieldCheck,
  Gauge,
  ChevronRight,
  UserPlus,
  Share,
  Copy,
  Zap,
} from 'lucide-react'
import { enderecoDoAtalho } from '../../lib/atalho'
import { useAcoes, useDadosDoDia, useOlhoApp, useSessaoAtual } from '../../app/contexto'
import { useLeituraRemota } from '../../app/useLeituraRemota'
import { Sheet } from '../../componentes/base'
import { dataCurta, emailValido, linkWhatsApp, mensagemConvite, somaDias } from '../../lib/formato'

import { AcaoConvite } from '../../componentes/AcaoConvite'

/** Família e ajustes: convites, aparência, privacidade, painel e sair. */
export function Ajustes() {
  const { api, familia, sessao } = useSessaoAtual()
  const { sair, toast, tentar } = useAcoes()
  const { versao } = useDadosDoDia()
  const { oculto } = useOlhoApp()
  // o convite é gravado ANTES de abrir o WhatsApp: se o banco recusar (e-mail repetido, sem internet), o motivo aparece na hora
  const [convidado, setConvidado] = useState<{ nome: string; email: string } | null>(null)
  const [convidando, setConvidando] = useState(false)
  const [tema, setTema] = useState<string>(() => {
    try {
      return localStorage.getItem('tema') || 'auto'
    } catch {
      return 'auto'
    }
  })
  const [nome2, setNome2] = useState('')
  const [email2, setEmail2] = useState('')
  const [n, setN] = useState(0)
  const link = location.origin + location.pathname
  const casal = familia?.papel === 'casal'
  // C20: com o casal completo, o convite é pra alguém da família (papel pessoa), e o título muda
  const {
    dado: lista,
    erro: falha,
    carregando,
    repetir,
  } = useLeituraRemota(
    `${familia?.id}:${casal}`,
    familia && casal && api.convites ? () => api.convites!(familia.id) : null,
    [api, n, versao],
  )
  const casalCompleto = (lista || []).filter(c => c.papel === 'casal' && c.situacao !== 'cancelado').length >= 2
  const papelConvite = casalCompleto ? 'pessoa' : 'casal'
  const mudaTema = (t: string) => {
    setTema(t)
    try {
      localStorage.setItem('tema', t)
    } catch {
      /* sem armazenamento */
    }
    if (t === 'auto') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
  }
  return (
    <div className="tela-larga f32-ajustes">
      <div className="col">
        <section className="card" aria-labelledby="aFam">
          <h2 id="aFam">
            <Icone nome="assessor" />
            {textoPrivado(familia?.nome)}
          </h2>
          <p className="sub" style={{ margin: '4px 0 12px' }}>
            Você entrou como{' '}
            <NomeDaPessoa editar pessoa={{ tipo: 'membro', id: familia?.membroId || '', nome: familia?.membroNome }} />
            {textoPrivado(sessao?.email ? ` (${sessao.email})` : '')}.
          </p>
          {/* A2: a pessoa da família (filha) não convida ninguém */}
          {!casal && (
            <p className="sub">
              Quem convida e cuida da família é o casal. Aqui você muda a aparência e vê a privacidade.
            </p>
          )}
          {casal && (
            <>
              {/* E3 (conserto 10): o campo ganha o rótulo "Nome" (antes só tinha a dica dentro do campo, que some ao digitar) */}
              <p className="lbl">{casalCompleto ? 'Convidar alguém da família' : 'Convidar a 2ª pessoa do casal'}</p>
              <label className="campo" style={{ marginTop: 8 }}>
                <span>Nome</span>
                <CampoPrivado
                  className="inp"
                  placeholder="Ex.: Helena"
                  value={nome2}
                  onChange={e => setNome2(e.target.value)}
                />
              </label>
              <label className="campo" style={{ marginTop: 10 }}>
                <span>E-mail de quem você está convidando</span>
                <CampoPrivado
                  className="inp"
                  type="email"
                  inputMode="email"
                  placeholder="pessoa@email.com"
                  value={email2}
                  onChange={e => setEmail2(e.target.value)}
                />
                <small>
                  {convidado && convidado.email === email2.trim().toLowerCase()
                    ? 'Convite guardado. A mensagem não leva nenhum valor em dinheiro: só o link e o e-mail.'
                    : 'A pessoa entra com esse e-mail, digita o código de 6 números que chega nele e já cai na família.'}
                </small>
              </label>
              <div className="row-btns" style={{ marginTop: 10 }}>
                {convidado && convidado.email === email2.trim().toLowerCase() ? (
                  <AcaoConvite
                    classe="btn primary"
                    oculto={oculto}
                    url={() =>
                      linkWhatsApp(
                        mensagemConvite('pessoa', {
                          familia: familia?.nome || '',
                          quem: convidado.nome,
                          link,
                          email: convidado.email,
                        }),
                      )
                    }
                  >
                    <Icone desenho={MessageCircle} />
                    Abrir o WhatsApp com o convite
                  </AcaoConvite>
                ) : (
                  <button
                    className="btn primary"
                    type="button"
                    disabled={convidando}
                    onClick={async () => {
                      if (!nome2.trim() || !emailValido(email2)) {
                        toast('Escreva o nome e o e-mail de quem você está convidando.')
                        return
                      }
                      if (!familia) return
                      setConvidando(true)
                      const ok = await tentar(() => api.convidar(familia.id, papelConvite, nome2.trim(), email2))
                      setConvidando(false)
                      if (ok) {
                        setConvidado({ nome: nome2.trim(), email: email2.trim().toLowerCase() })
                        setN(x => x + 1)
                        toast('Convite guardado. Agora mande a mensagem.')
                      }
                    }}
                  >
                    <Icone desenho={UserPlus} />
                    Convidar
                  </button>
                )}
                <a
                  className="btn line"
                  target="_blank"
                  rel="noreferrer"
                  href={linkWhatsApp(mensagemConvite('amiga', { familia: '', quem: '', link }), true)}
                >
                  <Icone desenho={MessageCircle} />
                  Chamar família amiga
                </a>
              </div>
            </>
          )}
        </section>
        {casal && <MembrosDaFamilia />}
        {api.convites && familia && casal && (
          <>
            {carregando && <p role="status">Buscando a família…</p>}
            {falha && (
              <div role="alert">
                <EstadoVazio
                  ilustracao="Erro"
                  titulo="Não foi possível buscar a família."
                  frase={lista ? 'Dados desatualizados.' : 'Confira a conexão e tente de novo.'}
                  acao={{ texto: 'Tentar novamente', aoClicar: repetir }}
                />
              </div>
            )}
            <QuemEsta lista={lista} mudou={() => setN(x => x + 1)} />
          </>
        )}
        <section className="card" aria-labelledby="aInst">
          <h2 id="aInst">
            <Icone desenho={Share} aria-hidden="true" />
            Pôr na tela do iPhone
          </h2>
          <p className="sub" style={{ marginTop: 6 }}>
            No Safari, toque em Compartilhar (o quadrado com a seta) e depois em "Adicionar à Tela de Início". O ícone
            "Central" abre sem a barra do navegador.
          </p>
        </section>
        {/* E9: o passo a passo literal pra montar a automação "Transação" no app Atalhos do iPhone */}
        <AtalhoIphone />
      </div>
      <div className="col">
        <section className="card" aria-labelledby="aTema">
          <h2 id="aTema">
            <Icone nome="ajustes" />
            Aparência
          </h2>
          <ControleFuncionarios />
          <div className="seg compacta" role="group" aria-label="Tema" style={{ marginTop: 12 }}>
            <button type="button" aria-pressed={tema === 'auto'} onClick={() => mudaTema('auto')}>
              <Icone desenho={Smartphone} />
              Automático
            </button>
            <button type="button" aria-pressed={tema === 'light'} onClick={() => mudaTema('light')}>
              <Icone desenho={Sun} />
              Claro
            </button>
            <button type="button" aria-pressed={tema === 'dark'} onClick={() => mudaTema('dark')}>
              <Icone desenho={Moon} />
              Escuro
            </button>
          </div>
          <p className="sub" style={{ marginTop: 8 }}>
            Automático segue o celular: escuro à noite se o celular estiver assim.
          </p>
        </section>
        <section className="card">
          <ul className="list">
            <li>
              <a className="li" href="#/privacidade" style={{ color: 'inherit', textDecoration: 'none' }}>
                <span className="tile">
                  <Icone desenho={ShieldCheck} />
                </span>
                <span className="m">
                  <b>Privacidade</b>
                  <small>termo, baixar e apagar dados</small>
                </span>
                <Icone desenho={ChevronRight} className="muted" />
              </a>
            </li>
            {sessao?.dono && (
              <li>
                <a className="li" href="#/painel" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="tile">
                    <Icone desenho={Gauge} />
                  </span>
                  <span className="m">
                    <b>Painel dos 4 números</b>
                    <small>só para o dono do produto</small>
                  </span>
                  <Icone desenho={ChevronRight} className="muted" />
                </a>
              </li>
            )}
            {api.modo === 'exemplo' && casal && (
              <li>
                <a className="li" href="#/primeiro-uso" style={{ color: 'inherit', textDecoration: 'none' }}>
                  <span className="tile">
                    <Icone desenho={UserPlus} />
                  </span>
                  <span className="m">
                    <b>Ver o primeiro uso</b>
                    <small>como uma família nova começa</small>
                  </span>
                  <Icone desenho={ChevronRight} className="muted" />
                </a>
              </li>
            )}
          </ul>
          <button
            className="btn line"
            type="button"
            style={{ marginTop: 12 }}
            onClick={async () => {
              location.hash = '#/inicio'
              await sair()
            }}
          >
            <Icone desenho={LogOut} />
            Sair
          </button>
        </section>
      </div>
    </div>
  )
}

function MembrosDaFamilia() {
  const membros = useMembros()
  return (
    <section className="card">
      <h2>
        <Icone nome="assessor" />
        Pessoas da família
      </h2>
      {membros.erro ? (
        <div role="status">
          <EstadoVazio
            ilustracao="Erro"
            titulo="Não foi possível carregar os nomes."
            frase="Confira a conexão e tente de novo."
            acao={{ texto: 'Tentar de novo', aoClicar: membros.repetir }}
          />
        </div>
      ) : (
        <ul className="list">
          {membros.lista.map(m => (
            <li className="li" key={m.id}>
              <span className="tile">
                <Icone nome="pessoa" />
              </span>
              <span className="m">
                <NomeDaPessoa editar pessoa={{ tipo: 'membro', id: m.id, nome: m.nome }} />
                <small>Pessoa da família</small>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** R4 + C20: quem está na família e como está cada convite. Reenviar avisa; cancelar pede confirmação. */
function QuemEsta({ lista, mudou }: { lista: ConviteFamilia[] | null; mudou: () => void }) {
  const { api, familia } = useSessaoAtual()
  const { tentar, toast } = useAcoes()
  const { oculto } = useOlhoApp()
  const setN = (_f: (x: number) => number) => mudou()
  const [cancelar, setCancelar] = useState<ConviteFamilia | null>(null)
  if (!lista || !familia) return null
  const link = location.origin + location.pathname
  return (
    <section className="card" aria-labelledby="aQuem">
      <h2 id="aQuem">Quem está na família</h2>
      <ul className="list" style={{ marginTop: 8 }}>
        {lista.map(c => (
          <li key={c.id} className="li quem">
            <span className="tile">
              <Icone nome="pessoa" />
            </span>
            <span className="m">
              <span className="quem-nome">
                <NomeDaPessoa
                  editar
                  mudou={mudou}
                  pessoa={{
                    tipo: c.situacao === 'entrou' ? 'membro' : 'convite',
                    id: c.membroId || c.id,
                    nome: c.nome,
                  }}
                />
                {c.nome === familia.membroNome ? ' (você)' : ''}
              </span>
              <small>
                {textoPrivado(c.email || 'sem e-mail')} · {c.papel === 'casal' ? 'casal' : 'pessoa da família'}
              </small>
              {c.situacao === 'entrou' ? (
                <span className="chip ok" style={{ marginTop: 6 }}>
                  entrou{c.entrou_em ? ` em ${dataCurta(c.entrou_em)}` : ''}
                </span>
              ) : (
                <span className="chip warn" style={{ marginTop: 6, whiteSpace: 'normal', height: 'auto' }}>
                  esperando entrar
                  {c.enviado_em
                    ? ` desde ${dataCurta(c.enviado_em)}, vale até ${dataCurta(somaDias(c.enviado_em, 14))}`
                    : ''}
                </span>
              )}
              {c.situacao === 'esperando' && (
                <span className="row-btns quem-btns">
                  <AcaoConvite
                    classe="btn sm line"
                    oculto={oculto}
                    url={() =>
                      linkWhatsApp(
                        mensagemConvite('pessoa', {
                          familia: familia.nome,
                          quem: c.nome,
                          link,
                          email: c.email || undefined,
                        }),
                      )
                    }
                    aoAbrir={() => {
                      void tentar(async () => {
                        await api.reenviarConvite?.(familia.id, c.id)
                        setN(x => x + 1)
                        toast(
                          `Convite de ${c.nome} reenviado: vale mais 14 dias. Mande a mensagem de novo no WhatsApp que abriu.`,
                        )
                      })
                    }}
                  >
                    <Icone nome="email" />
                    Reenviar
                  </AcaoConvite>
                  <button className="btn sm ghost" type="button" onClick={() => setCancelar(c)}>
                    <Icone nome="fechar" />
                    Cancelar convite
                  </button>
                </span>
              )}
            </span>
            <span />
          </li>
        ))}
      </ul>
      <p className="sub" style={{ marginTop: 8 }}>
        A pessoa entra com o mesmo e-mail do convite. Se ela usar outro e-mail, cancele e convide de novo.
      </p>
      {cancelar && (
        <Sheet titulo={textoPrivado(`Cancelar o convite de ${cancelar.nome}?`)} fechar={() => setCancelar(null)}>
          <p className="corpo">
            O link que {textoPrivado(cancelar.nome)} recebeu para de funcionar. Dá para convidar de novo depois, com o
            e-mail certo.
          </p>
          <button
            className="btn primary full"
            type="button"
            onClick={async () => {
              const c = cancelar
              setCancelar(null)
              if (await tentar(() => api.cancelarConvite!(familia.id, c.id))) {
                setN(x => x + 1)
                toast(`Convite de ${c.nome} cancelado.`)
              }
            }}
          >
            Sim, cancelar o convite
          </button>
          <button className="btn ghost full" type="button" onClick={() => setCancelar(null)}>
            Não, deixar como está
          </button>
        </Sheet>
      )}
    </section>
  )
}

/** E9: o Atalho do iPhone. Pagou com Apple Pay, o app abre o Anotar já preenchido (nunca salva sozinho). */
export const PASSOS_ATALHO = [
  'Abra o app Atalhos (o ícone de quadrados coloridos) e toque em "Automação", na parte de baixo.',
  'Toque em "Nova Automação" (ou no "+", em cima) e escolha "Transação". Em alguns iPhones o nome é "Carteira".',
  'Marque os cartões que você usa no Apple Pay. Deixe todas as categorias marcadas. Escolha "Executar Imediatamente" e toque em "Seguinte".',
  'Toque em "Nova Automação em Branco" e depois em "Adicionar Ação". Na busca, escreva URL e toque em "URL".',
  'Toque no campo da URL e cole o endereço copiado aqui embaixo (botão "Copiar o endereço"). Ele termina em valor=.',
  'Logo depois de valor=, toque em "Entrada do Atalho" (aparece em cima do teclado) e escolha "Quantia".',
  'Escreva &loja= e escolha "Entrada do Atalho" de novo, agora "Comerciante". Escreva &cartao= e escolha "Entrada do Atalho", agora "Cartão ou Passe".',
  'Toque em "Adicionar Ação" de novo, escreva Abrir URLs na busca e toque em "Abrir URLs". Toque em "OK" para terminar.',
  'Pra testar, pague algo pequeno com Apple Pay. O iPhone abre o app com o Anotar preenchido: confira e toque no seu nome para salvar. Nada é salvo sozinho.',
]
function AtalhoIphone() {
  const { toast } = useAcoes()
  const base = location.origin + location.pathname
  const endereco = enderecoDoAtalho(base)
  const copiar = async () => {
    try {
      if (await copiarProtegido(endereco, undefined, toast))
        toast('Endereço copiado. Cole no campo da URL, no app Atalhos.')
    } catch {
      toast('Não foi possível copiar. Segure o dedo no endereço e escolha Copiar.')
    }
  }
  return (
    <section className="card" aria-labelledby="aAtalho">
      <h2 id="aAtalho">
        <Icone desenho={Zap} aria-hidden="true" />
        Atalho do iPhone (Apple Pay)
      </h2>
      <p className="sub" style={{ marginTop: 6 }}>
        Pagou com Apple Pay, o app abre o Anotar com o valor, a loja e o cartão já preenchidos. Você só confere e toca
        no seu nome. Monta 1 vez só, em uns 3 minutos:
      </p>
      <details className="f32-instrucoes">
        <summary>
          <Icone nome="ajuda" />
          Como configurar o atalho
        </summary>
        <ol className="passos-atalho">
          {PASSOS_ATALHO.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      </details>
      <p className="lbl" style={{ marginTop: 10 }}>
        O endereço para colar no passo 5
      </p>
      <p className="atalho-end">
        <code>{textoPrivado(endereco)}</code>
      </p>
      <p className="sub atalho-montado">
        Montado, o campo da URL fica assim: {textoPrivado(endereco)}
        <b>Quantia</b>&amp;loja=<b>Comerciante</b>&amp;cartao=<b>Cartão ou Passe</b> (as palavras em negrito são as que
        você escolhe em "Entrada do Atalho").
      </p>
      <button className="btn line" type="button" style={{ marginTop: 10 }} onClick={copiar}>
        <Icone desenho={Copy} />
        Copiar o endereço
      </button>
      <p className="sub" style={{ marginTop: 10 }}>
        O iPhone abre o endereço no Safari. Na 1ª vez, entre no app pelo Safari também, com o mesmo e-mail. Os nomes dos
        botões podem mudar um pouco conforme a versão do iPhone.
      </p>
    </section>
  )
}
