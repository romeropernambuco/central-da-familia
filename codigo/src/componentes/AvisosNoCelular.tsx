import { useEffect, useState } from 'react'
import { BellRing } from 'lucide-react'
import { useAcoes, useSessaoAtual } from '../app/contexto'
import { deB64u } from '../lib/webpush'
import { Botao } from './base'
import { Icone } from './Icone'

type Estado = 'vendo' | 'exemplo' | 'sem_suporte' | 'iphone_fora' | 'negado' | 'desligado' | 'ligado'

const ehIphone = () => /iPhone|iPad|iPod/.test(navigator.userAgent)
const instalado = () =>
  (typeof matchMedia !== 'undefined' && matchMedia('(display-mode: standalone)').matches) ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

/**
 * Avisos no celular (Web Push): todo dia às 19h, se houver, o prazo de dinheiro na rua, o aluguel que passou do dia
 * e a fatura que vence amanhã. O aviso nunca leva valor nem nome (aparece na tela bloqueada). Só o casal.
 */
export function AvisosNoCelular() {
  const { api, familia } = useSessaoAtual()
  const { tentar, toast } = useAcoes()
  const [estado, setEstado] = useState<Estado>('vendo')
  const [gravando, setGravando] = useState(false)
  useEffect(() => {
    let vivo = true
    const pronto = (e: Estado) => vivo && setEstado(e)
    void (async () => {
      if (api.modo === 'exemplo' || !api.celularLigar) return pronto('exemplo')
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
        return pronto(ehIphone() && !instalado() ? 'iphone_fora' : 'sem_suporte')
      if (Notification.permission === 'denied') return pronto('negado')
      const reg = await navigator.serviceWorker.getRegistration()
      pronto((await reg?.pushManager.getSubscription()) ? 'ligado' : 'desligado')
    })().catch(() => pronto('sem_suporte'))
    return () => {
      vivo = false
    }
  }, [api])

  const ligar = async () => {
    setGravando(true)
    const ok = await tentar(async () => {
      const chave = await api.celularChavePublica!()
      if (!chave) throw new Error('Os avisos ainda estão sendo preparados no servidor. Tente de novo mais tarde.')
      if ((await Notification.requestPermission()) !== 'granted') {
        setEstado('negado')
        throw new Error('Sem a sua permissão, o celular não mostra os avisos.')
      }
      const reg = await navigator.serviceWorker.ready
      const sub =
        (await reg.pushManager.getSubscription()) ||
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: deB64u(chave).buffer as ArrayBuffer,
        }))
      const j = sub.toJSON()
      await api.celularLigar!(familia!.id, { endpoint: sub.endpoint, p256dh: j.keys!.p256dh, auth: j.keys!.auth })
    })
    setGravando(false)
    if (ok) {
      setEstado('ligado')
      toast('Avisos ligados neste aparelho. O primeiro chega às 19h, se houver algo.')
    }
  }
  const desligar = async () => {
    setGravando(true)
    const ok = await tentar(async () => {
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()
      if (sub) {
        await api.celularDesligar!(sub.endpoint)
        await sub.unsubscribe()
      }
    })
    setGravando(false)
    if (ok) {
      setEstado('desligado')
      toast('Avisos desligados neste aparelho.')
    }
  }

  // os avisos falam de dinheiro da família: só o casal liga
  if (familia?.papel !== 'casal') return null
  return (
    <section className="card" aria-labelledby="avisosCelular">
      <h2 id="avisosCelular">
        <Icone desenho={BellRing} aria-hidden="true" />
        Avisos no celular
      </h2>
      <p className="sub" style={{ margin: '8px 0 12px' }}>
        Todo dia às 19h, se houver: prazo de dinheiro na rua, aluguel que passou do dia sem chegar e fatura de cartão
        que vence amanhã. O aviso nunca mostra valor nem nome: na tela bloqueada aparece só o assunto.
      </p>
      {estado === 'ligado' && (
        <>
          <p className="sub">Ligados neste aparelho.</p>
          <Botao variante="secundario" type="button" disabled={gravando} onClick={desligar}>
            Desligar os avisos neste aparelho
          </Botao>
        </>
      )}
      {estado === 'desligado' && (
        <Botao variante="primario" type="button" disabled={gravando} onClick={ligar}>
          <Icone desenho={BellRing} />
          Ligar os avisos neste aparelho
        </Botao>
      )}
      {estado === 'negado' && (
        <p className="sub">
          Este aparelho bloqueou os avisos da Central. Libere em Notificações, nas configurações do navegador, e volte
          aqui.
        </p>
      )}
      {estado === 'iphone_fora' && (
        <p className="sub">
          No iPhone, os avisos só funcionam com a Central na tela de início: toque em Compartilhar, depois em “Adicionar
          à Tela de Início”, e abra a Central por lá.
        </p>
      )}
      {estado === 'sem_suporte' && (
        <p className="sub">
          Este navegador não recebe avisos. No Android, use o Chrome; no iPhone, ponha a Central na tela de início.
        </p>
      )}
      {estado === 'exemplo' && <p className="sub">No modo exemplo os avisos não são ligados.</p>}
    </section>
  )
}
