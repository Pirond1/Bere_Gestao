/*
 * PWA (BG-18): registro do service worker e convite de instalação.
 * Importado no main.jsx — o evento de instalação dispara logo que a página abre e não se repete.
 */

const listeners = new Set()
const state = { installEvent: null, waitingWorker: null }

function notify() {
  listeners.forEach((fn) => fn({ ...state }))
}

export function subscribePwa(fn) {
  listeners.add(fn)
  fn({ ...state })
  return () => listeners.delete(fn)
}

/** Já está aberto como app instalado (tela cheia), no Android ou no iPhone. */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

/** iPhone/iPad no Safari: não tem botão de instalar automático — só pelo menu Compartilhar. */
export function isIos() {
  const ua = window.navigator.userAgent
  const ipadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /iphone|ipad|ipod/i.test(ua) || ipadOs
}

/** Abre a janela de instalação do navegador (Android/Chrome/Edge). */
export async function promptInstall() {
  const event = state.installEvent
  if (!event) return false
  event.prompt()
  const { outcome } = await event.userChoice
  // O mesmo evento não pode ser usado de novo
  state.installEvent = null
  notify()
  return outcome === 'accepted'
}

/** Ativa a versão nova do app e recarrega quando ela assumir. */
export function applyUpdate() {
  state.waitingWorker?.postMessage('ATUALIZAR')
}

function watchWaiting(registration) {
  const setWaiting = (worker) => {
    // Só é "atualização" se já havia uma versão controlando a página
    if (worker && navigator.serviceWorker.controller) {
      state.waitingWorker = worker
      notify()
    }
  }
  setWaiting(registration.waiting)
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    worker?.addEventListener('statechange', () => {
      if (worker.state === 'installed') setWaiting(worker)
    })
  })
}

export function setupPwa() {
  window.addEventListener('beforeinstallprompt', (event) => {
    // Segura o convite do navegador para mostrar o nosso, no momento certo
    event.preventDefault()
    state.installEvent = event
    notify()
  })
  window.addEventListener('appinstalled', () => {
    state.installEvent = null
    notify()
  })

  // Só no build de produção: em desenvolvimento o cache atrapalharia o hot reload
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return

  let reloading = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    window.location.reload()
  })

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        watchWaiting(registration)
        // Confere se saiu versão nova a cada hora com o app aberto
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000)
      })
      .catch(() => {
        // Sem service worker o site funciona normalmente, só não fica instalável/offline
      })
  })
}
