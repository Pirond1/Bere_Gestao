/*
 * Service worker da Dona Berê Doces (BG-18).
 *
 * Guarda só o "app" (telas, estilos, fontes, fotos dos produtos) para abrir rápido e funcionar
 * sem internet. Os dados da API (pedidos, pagamentos, agenda, conta) NUNCA ficam guardados:
 * são pessoais e precisam estar sempre atualizados — vaga ou status de pagamento antigo é pior que erro.
 *
 * Ao mudar este arquivo, troque a VERSAO: o navegador instala a nova e o app oferece "Atualizar".
 */
const VERSAO = 'v1'
const CACHE_APP = `bere-app-${VERSAO}`
const CACHE_FOTOS = `bere-fotos-${VERSAO}`
const MAX_FOTOS = 80

// O mínimo para o app abrir offline: o HTML (que carrega o resto) e a identidade
const ESSENCIAIS = ['/', '/manifest.webmanifest', '/favicon.svg', '/pwa-192x192.png', '/apple-touch-icon.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_APP).then((cache) => cache.addAll(ESSENCIAIS)))
})

self.addEventListener('activate', (event) => {
  // Apaga caches de versões anteriores
  event.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('bere-') && !n.endsWith(VERSAO)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  )
})

// O app pede para ativar a versão nova quando a pessoa clica em "Atualizar"
self.addEventListener('message', (event) => {
  if (event.data === 'ATUALIZAR') self.skipWaiting()
})

async function limitar(nomeCache, maximo) {
  const cache = await caches.open(nomeCache)
  const chaves = await cache.keys()
  await Promise.all(chaves.slice(0, Math.max(chaves.length - maximo, 0)).map((k) => cache.delete(k)))
}

/** Rede primeiro; sem internet, a última versão guardada (ou o app, para navegação). */
async function redePrimeiro(request) {
  const cache = await caches.open(CACHE_APP)
  try {
    const resposta = await fetch(request)
    if (resposta.ok) cache.put('/', resposta.clone())
    return resposta
  } catch {
    // SPA: qualquer rota é o mesmo index.html; o React Router resolve a tela
    return (await cache.match('/')) ?? Response.error()
  }
}

/** Guardado primeiro: arquivos com hash no nome nunca mudam de conteúdo. */
async function guardadoPrimeiro(request, nomeCache) {
  const cache = await caches.open(nomeCache)
  const guardado = await cache.match(request)
  if (guardado) return guardado
  const resposta = await fetch(request)
  if (resposta.ok || resposta.type === 'opaque') cache.put(request, resposta.clone())
  return resposta
}

/** Mostra o guardado na hora e atualiza em segundo plano (fontes e fotos podem mudar). */
async function guardadoEAtualiza(request, nomeCache, maximo) {
  const cache = await caches.open(nomeCache)
  const guardado = await cache.match(request)
  const atualizado = fetch(request)
    .then(async (resposta) => {
      if (resposta.ok || resposta.type === 'opaque') {
        await cache.put(request, resposta.clone())
        if (maximo) await limitar(nomeCache, maximo)
      }
      return resposta
    })
    .catch(() => guardado)
  return guardado ?? atualizado
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  // Abrir uma tela do app
  if (request.mode === 'navigate' && url.origin === self.location.origin) {
    event.respondWith(redePrimeiro(request))
    return
  }
  // JS/CSS do build (com hash no nome) e arquivos do próprio app
  if (url.origin === self.location.origin && (url.pathname.startsWith('/assets/') || ESSENCIAIS.includes(url.pathname))) {
    event.respondWith(guardadoPrimeiro(request, CACHE_APP))
    return
  }
  // Fontes do Google
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(guardadoEAtualiza(request, CACHE_APP))
    return
  }
  // Fotos dos produtos (servidas pela API) — não são dados pessoais
  if (url.pathname.startsWith('/uploads/') && request.destination === 'image') {
    event.respondWith(guardadoEAtualiza(request, CACHE_FOTOS, MAX_FOTOS))
    return
  }
  // Todo o resto (API: pedidos, conta, pagamentos...) vai direto para a rede, sem cache
})
