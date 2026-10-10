import api from './api'

// A barra final evita um redirect 307 extra da FastAPI a cada chamada
export async function listProducts({ pagina = 1, limite = 100 } = {}) {
  const { data } = await api.get('/produtos/', { params: { pagina, limite } })
  return data
}

export async function listCategories() {
  const { data } = await api.get('/categorias/')
  return data
}