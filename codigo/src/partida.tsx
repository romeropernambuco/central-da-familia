// O app de verdade: tema, banco, tela e service worker (a porta de entrada é o main.tsx).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './estilo.css'
import { carregarApi, modoExemplo } from './api'
import { Provedor } from './app/contexto'
import { App } from './app/App'

// tema: automático pelo celular; "claro" ou "escuro" se a pessoa escolher em Ajustes
try { const t = localStorage.getItem('tema'); if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t } catch { /* sem armazenamento */ }

/** Abre o app. Se não der (banco sem endereço, pedaço que não baixou), a promessa falha e o main.tsx mostra a tela de falha. */
export async function iniciar(): Promise<void> {
  const api = await carregarApi()
  const raiz = document.getElementById('root')
  if (!raiz) throw new Error('Página sem o lugar do app (#root).')
  createRoot(raiz).render(
    <StrictMode><Provedor api={api}><App /></Provedor></StrictMode>,
  )
}

// app instalável: o service worker guarda a casca do app (não guarda dado de família)
if ('serviceWorker' in navigator && location.protocol === 'https:' && !import.meta.env.VITE_DEMO && !modoExemplo) {
  addEventListener('load', () => {
    // updateViaCache none: o navegador sempre confere se saiu versão nova do sw.js
    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(reg => {
      // app instalado fica aberto por dias sem recarregar: confere versão nova toda vez que volta pra frente
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}) })
    }).catch(() => {})
  })
}
