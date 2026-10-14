import api from './api'

/** Todos os produtos, inclusive desativados (o painel vê tudo). */
export async function listAllProducts() {
  const { data } = await api.get('/produtos/', { params: { apenas_disponiveis: false, limite: 100 } })
  return data
}

/** dados: { nome, descricao, preco, categoria_id, disponivel } — a foto vai à parte. */
export async function createProduct(dados) {
  const { data } = await api.post('/produtos/', dados)
  return data
}

export async function updateProduct(id, dados) {
  const { data } = await api.put(`/produtos/${id}`, dados)
  return data
}

/** A API reduz e converte para WebP; aceita JPG, PNG ou WebP até 10 MB. */
export async function uploadProductPhoto(id, file) {
  const form = new FormData()
  form.append('arquivo', file)
  // Foto grande no 4G pode demorar mais que o timeout padrão
  const { data } = await api.post(`/produtos/${id}/foto`, form, { timeout: 60000 })
  return data
}

export async function removeProductPhoto(id) {
  const { data } = await api.delete(`/produtos/${id}/foto`)
  return data
}

/** Só funciona para produto nunca vendido — a API responde 409 nos demais. */
export async function deleteProduct(id) {
  await api.delete(`/produtos/${id}`)
}

export async function createCategory(dados) {
  const { data } = await api.post('/categorias/', dados)
  return data
}

export async function updateCategory(id, dados) {
  const { data } = await api.put(`/categorias/${id}`, dados)
  return data
}

/** A API recusa (409) se houver produtos na categoria. */
export async function deleteCategory(id) {
  await api.delete(`/categorias/${id}`)
}
