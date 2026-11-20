import './entrar.css'
import { EstadoVazioVisual } from '../../componentes/EstadoVazioVisual'
import { AssessorDaCasa, Erro } from '../../componentes/ilustracoes/figuras'
import { Bemvindo } from '../../componentes/ilustracoes'
import { Botao } from '../../componentes/base'
import { Icone } from '../../componentes/Icone'
import { prepararAcolhimento } from '../../lib/acolhimento'
import { CampoPrivado, textoPrivado } from '../../componentes/privacidade'
import { useEffect, useState } from 'react'
import { ArrowLeft, Mail, Users } from 'lucide-react'
import { useApp } from '../../app/contexto'
import { Marca } from '../../componentes/Marca'
import { codigo4Valido, codigo6Valido, emailValido } from '../../lib/formato'
import { conviteDoHash, ehLinkEquipe } from '../../app/rotas'
import { CONVITE_EXEMPLO } from '../../api/conviteExemplo'

type Passo = 'email' | 'codigo' | 'equipe'

/** Entrar: e-mail com código de 6 números; a equipe da casa abre o link do convite e digita o código de 4 números. */
export function Entrar() {
  const { api, trocarSessao, toast } = useApp()
  // o convite da equipe vem no link (#/equipe?c=<id>): a tela lê o id e pede só os 4 números
  const [convite, setConvite] = useState<string | null>(() => conviteDoHash(location.hash))
  const [passo, setPasso] = useState<Passo>(() => (ehLinkEquipe(location.hash) ? 'equipe' : 'email'))
  useEffect(() => {
    const f = () => {
      const c = conviteDoHash(location.hash)
      setConvite(c)
      if (ehLinkEquipe(location.hash)) {
        setPasso('equipe')
        setCodigo('')
        setErro('')
      }
    }
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const ex = api.modo === 'exemplo'

  async function faz(f: () => Promise<void>) {
    setErro('')
    setOcupado(true)
    try {
      await f()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="entrar f32-entrada">
      <div className="logo">
        <Marca size={48} />
        <b>Central da Família</b>
      </div>
      <div className="entrada-apresentacao">
        <Bemvindo />
        <h1>Sua casa, bem cuidada.</h1>
        <p className="corpo">
          Quanto a sua casa pode gastar hoje, num número só. Dinheiro, feira e Assessores da Casa no mesmo lugar.
        </p>
      </div>

      {passo === 'email' && (
        <form
          className="card"
          style={{ display: 'grid', gap: 16 }}
          onSubmit={e => {
            e.preventDefault()
            faz(async () => {
              if (!emailValido(email)) throw new Error('Informe um e-mail válido.')
              await api.enviarCodigo(email)
              setPasso('codigo')
            })
          }}
        >
          <h2>Entrar</h2>
          <label className="campo">
            <span>Seu e-mail</span>
            <CampoPrivado
              className="inp"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <small>Você receberá um código de 6 números neste e-mail. Não é preciso criar uma senha.</small>
          </label>
          {erro && <AvisoConvite mensagem={erro} />}
          <Botao variante="primario" className="full" disabled={ocupado} type="submit" carregando={ocupado}>
            <Icone desenho={Mail} />
            Receber o código
          </Botao>
          <Botao
            variante="secundario"
            className="equipe-lnk"
            type="button"
            onClick={() => {
              setErro('')
              setCodigo('')
              setPasso('equipe')
            }}
          >
            <Icone desenho={Users} aria-hidden="true" />
            <span>
              <b>Assessor da Casa</b>
              <small>Entrar com o convite da família</small>
            </span>
          </Botao>
        </form>
      )}

      {passo === 'codigo' && (
        <form
          className="card"
          style={{ display: 'grid', gap: 16 }}
          onSubmit={e => {
            e.preventDefault()
            faz(async () => {
              if (!codigo6Valido(codigo)) throw new Error('O código tem 6 números.')
              const r = await api.confirmarCodigo(email, codigo)
              await trocarSessao()
              if (r && r.aviso) toast(mensagemConvite(r.aviso))
            })
          }}
        >
          <button type="button" className="lnk" style={{ justifySelf: 'start' }} onClick={() => setPasso('email')}>
            <Icone desenho={ArrowLeft} />
            Trocar e-mail
          </button>
          <h2>Digite o código</h2>
          <p className="sub">
            Mandamos 6 números para <b>{textoPrivado(email)}</b>. Pode levar 1 minuto. Olhe também a caixa de spam.
          </p>
          <CampoPrivado
            className="inp cod"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            aria-label="Código de 6 números"
            value={codigo}
            onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {ex && <p className="sub">No exemplo, o código é 123456.</p>}
          {erro && <AvisoConvite mensagem={erro} />}
          <Botao
            variante="primario"
            className="full"
            disabled={ocupado || codigo.length !== 6}
            type="submit"
            carregando={ocupado}
          >
            <Icone nome="abrir" />
            Entrar
          </Botao>
        </form>
      )}

      {passo === 'equipe' && (
        <form
          className="card"
          style={{ display: 'grid', gap: 16 }}
          onSubmit={e => {
            e.preventDefault()
            if (!convite) return
            faz(async () => {
              if (!codigo4Valido(codigo)) throw new Error('O código do Assessor da Casa tem 4 números.')
              await api.entrarEquipe(convite, codigo)
              prepararAcolhimento()
              location.hash = '#/casa'
              await trocarSessao()
            })
          }}
        >
          <button
            type="button"
            className="lnk"
            style={{ justifySelf: 'start' }}
            onClick={() => {
              setErro('')
              setPasso('email')
            }}
          >
            <Icone desenho={ArrowLeft} />
            Voltar
          </button>
          <h2>Assessor da Casa</h2>
          {convite ? (
            <>
              <p className="sub">
                Digite os 4 números que vieram junto com este link. O código vale por 24 horas e só funciona neste link.
                Você vai ver só a tela da Casa, para anotar as compras.
              </p>
              <CampoPrivado
                className="inp cod"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={4}
                aria-label="Código de 4 números"
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
              {ex && <p className="sub">No exemplo, o código é 2468.</p>}
              {erro && <AvisoConvite mensagem={erro} />}
              <Botao
                variante="primario"
                className="full"
                disabled={ocupado || codigo.length !== 4}
                type="submit"
                carregando={ocupado}
              >
                <Icone nome="casa" />
                Entrar na Casa
              </Botao>
            </>
          ) : (
            <>
              <EstadoVazioVisual
                ilustracao={<AssessorDaCasa />}
                titulo="Peça o link para quem cuida da família."
                frase="O convite chega no WhatsApp com um código de 4 números. Abra o link neste celular e digite o código."
              />
              <p className="sub">
                Se o link já chegou e abriu esta tela, ele veio cortado: peça para mandarem de novo.
              </p>
              {ex && (
                <a className="btn line full" href={'#/equipe?c=' + CONVITE_EXEMPLO}>
                  Abrir o link de exemplo
                </a>
              )}
            </>
          )}
        </form>
      )}
      <p className="sub">
        Ao entrar você aceita o termo de uso. O acesso aos dados e as opções de baixar ou pedir encerramento dependem do
        seu papel. Consulte Privacidade após entrar.
      </p>
    </div>
  )
}

export function mensagemConvite(mensagem: string): string {
  const m = mensagem
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (/conexao|rede|network|fetch|load failed|nao foi possivel confirmar/.test(m))
    return 'A conexão falhou. Confira a internet e tente novamente com o mesmo link e código.'
  if (/e-mail do convite|mesmo e-mail que recebeu|email.*diferente/.test(m))
    return 'Use o e-mail para o qual o convite foi enviado. Volte em Trocar e-mail ou peça outro convite a quem enviou.'
  if (/convite.*(vencido|expirado|reconhecido|encontrado|usado|invalido)|codigo errado ou vencido/.test(m))
    return 'Não foi possível reconhecer o convite ou ele venceu. Peça um novo link e código a quem convidou.'
  if (/conta|account|user.*(exist|found)|e-mail.*(existe|cadastrado)/.test(m))
    return 'Não foi possível entrar com esses dados. Confira o e-mail e o código ou fale com quem convidou.'
  if (/[^\s@]+@[^\s@]+/.test(mensagem))
    return 'Não foi possível entrar com esses dados. Confira o e-mail e o código ou fale com quem convidou.'
  return mensagem
}

export function AvisoConvite({ mensagem }: { mensagem: string }) {
  return (
    <div className="f32-erro" role="alert">
      <EstadoVazioVisual
        ilustracao={<Erro />}
        titulo="Vamos tentar de novo?"
        frase={textoPrivado(mensagemConvite(mensagem))}
      />
    </div>
  )
}
