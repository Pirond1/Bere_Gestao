import api from '../services/api'

/**
 * Fotos enviadas pelo painel vêm da API como caminho ("/uploads/produtos/3-ab12.webp").
 * Links completos (ou prévias locais blob:) passam direto.
 */
export function mediaUrl(path) {
  if (!path || !path.startsWith('/')) return path
  return `${api.defaults.baseURL.replace(/\/$/, '')}${path}`
}
