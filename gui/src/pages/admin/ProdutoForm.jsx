import { ArrowLeft, ImagePlus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useId, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ProductImage } from '../../components/ProductImage'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { useAsync } from '../../hooks/useAsync'
import {
  createProduct,
  deleteProduct,
  updateProduct,
  uploadProductPhoto,
} from '../../services/adminProductService'
import { getProduct, listCategories } from '../../services/productService'
import { cn } from '../../utils/cn'
import { getErrorMessage } from '../../utils/errors'

// Mesmos limites da API (services/imagem_service.py)
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES = 10 * 1024 * 1024
const MAX_DESCRIPTION = 1000
// RF_B02: barra preço exorbitante (mesmo teto de schemas/produto.py)
const MAX_PRICE = 500

/** "12,50", "1.234,5" ou "12.50" → "12.50"; null se não for um valor válido. */
function parsePrice(text) {
  let value = text.replace(/R\$|\s/g, '')
  if (value.includes(',')) value = value.replace(/\./g, '').replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(value) || Number(value) <= 0) return null
  return Number(value).toFixed(2)
}

const priceToInput = (preco) => Number(preco).toFixed(2).replace('.', ',')

function Switch({ checked, onChange, label, description }) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium">
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors',
          checked ? 'bg-success' : 'bg-chocolate/20',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-5',
          )}
        />
      </button>
    </div>
  )
}

function PhotoPicker({ src, onPick, error }) {
  const inputId = useId()

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    // Permite escolher o mesmo arquivo de novo
    e.target.value = ''
    if (file) onPick(file)
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">Foto</p>
      <div className="aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed">
        <ProductImage src={src} alt="Prévia da foto do produto" iconClassName="h-1/4" />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border-2 border-chocolate/20 px-3 text-sm font-medium transition-colors hover:border-gold hover:bg-gold/10 focus-within:border-gold"
        >
          <ImagePlus className="h-4 w-4" aria-hidden="true" />
          {src ? 'Trocar foto' : 'Escolher foto'}
          <input id={inputId} type="file" accept={PHOTO_TYPES.join(',')} onChange={handleChange} className="sr-only" />
        </label>
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          JPG, PNG ou WebP até 10 MB. A vitrine mostra a foto no formato deste quadro — deixe o doce no centro.
        </p>
      )}
    </div>
  )
}

function DeleteProduct({ produto, onDeactivate }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setLoading(true)
    setError('')
    try {
      await deleteProduct(produto.id)
      toast.success(`"${produto.nome}" excluído`)
      navigate('/admin/produtos', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Excluir produto
      </Button>
    )
  }

  return (
    <Card className="border-destructive/30 bg-destructive/5 p-4">
      <p className="mb-1 font-medium">Excluir "{produto.nome}" de vez?</p>
      <p className="mb-4 text-sm text-muted-foreground">
        Use para cadastros feitos por engano. Produto que já foi vendido não pode ser excluído — desative-o para tirar
        da vitrine.
      </p>
      {error && <Alert className="mb-4">{error}</Alert>}
      <div className="flex flex-wrap gap-3">
        {error && produto.disponivel ? (
          <Button onClick={onDeactivate}>Desativar em vez disso</Button>
        ) : (
          <Button className="bg-destructive hover:bg-destructive/90" onClick={handleDelete} loading={loading}>
            Sim, excluir
          </Button>
        )}
        <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Manter produto
        </Button>
      </div>
    </Card>
  )
}

function ProductEditor({ produto, categorias }) {
  const navigate = useNavigate()
  const isNew = !produto

  const [form, setForm] = useState({
    nome: produto?.nome ?? '',
    descricao: produto?.descricao ?? '',
    preco: produto ? priceToInput(produto.preco) : '',
    categoria_id: produto ? String(produto.categoria_id) : categorias.length === 1 ? String(categorias[0].id) : '',
    disponivel: produto?.disponivel ?? true,
  })
  // Foto nova escolhida — enviada só ao salvar. A foto é obrigatória: dá para trocar, não remover
  const [photo, setPhoto] = useState({ file: null, preview: null })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Libera a memória da prévia quando troca de arquivo ou sai da tela
  useEffect(() => () => photo.preview && URL.revokeObjectURL(photo.preview), [photo.preview])

  const update = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))
  const currentPhoto = photo.preview ?? produto?.foto

  const pickPhoto = (file) => {
    if (!PHOTO_TYPES.includes(file.type)) {
      setErrors((e) => ({ ...e, foto: 'Formato não suportado — escolha JPG, PNG ou WebP' }))
      return
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setErrors((e) => ({ ...e, foto: 'A foto pode ter no máximo 10 MB' }))
      return
    }
    setErrors((e) => ({ ...e, foto: undefined }))
    setPhoto({ file, preview: URL.createObjectURL(file) })
  }

  const save = async (overrides = {}) => {
    const dados = { ...form, ...overrides }
    const preco = parsePrice(dados.preco)
    const found = {}
    if (!dados.nome.trim()) found.nome = 'Informe o nome do produto'
    if (!dados.descricao.trim()) found.descricao = 'Informe a descrição do produto'
    if (!preco) found.preco = 'Informe um preço válido, ex.: 45,90'
    else if (Number(preco) > MAX_PRICE) found.preco = 'O preço máximo é R$ 5.000,00 — confira se não sobrou um zero'
    if (!dados.categoria_id) found.categoria_id = 'Escolha a categoria'
    if (!currentPhoto) found.foto = 'Escolha uma foto — ela aparece na vitrine'
    setErrors(found)
    setError('')
    if (Object.keys(found).length) return

    setSaving(true)
    // Sem foto o produto não entra na vitrine: se a foto nova ainda vai subir, a vitrine fica para depois
    const showAfterPhoto = dados.disponivel && (isNew || Boolean(photo.file))
    const payload = {
      nome: dados.nome.trim(),
      descricao: dados.descricao.trim(),
      preco,
      categoria_id: Number(dados.categoria_id),
      ...(showAfterPhoto ? {} : { disponivel: dados.disponivel }),
    }

    let salvo
    try {
      salvo = isNew ? await createProduct(payload) : await updateProduct(produto.id, payload)
    } catch (err) {
      setError(getErrorMessage(err))
      setSaving(false)
      return
    }

    try {
      if (photo.file) await uploadProductPhoto(salvo.id, photo.file)
      if (showAfterPhoto) salvo = await updateProduct(salvo.id, { disponivel: true })
    } catch (err) {
      // Os dados já foram salvos: fica na edição do produto para tentar a foto de novo
      toast.error('Produto salvo, mas a foto não foi atualizada', { description: getErrorMessage(err) })
      navigate(`/admin/produtos/${salvo.id}`, { replace: true })
      return
    }

    toast.success(isNew ? 'Produto cadastrado' : 'Produto atualizado', { description: salvo.nome })
    navigate('/admin/produtos')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    save()
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="space-y-5 p-5 md:p-6">
          <Field
            label="Nome"
            value={form.nome}
            onChange={update('nome')}
            maxLength={100}
            error={errors.nome}
            placeholder="Ex.: Bolo de cenoura com chocolate"
          />

          <div className="space-y-1.5">
            <label htmlFor="descricao" className="block text-sm font-medium">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={form.descricao}
              onChange={update('descricao')}
              maxLength={MAX_DESCRIPTION}
              rows={4}
              placeholder="Sabor, recheio, tamanho, quantas pessoas serve…"
              aria-invalid={Boolean(errors.descricao)}
              className={cn(
                'w-full resize-y rounded-lg border-2 bg-white p-3 text-base placeholder:text-muted-foreground/60 focus:border-gold focus:outline-none',
                errors.descricao && 'border-destructive/60',
              )}
            />
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-sm text-destructive">{errors.descricao}</span>
              <span className="text-muted-foreground tabular-nums">
                {form.descricao.length}/{MAX_DESCRIPTION}
              </span>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Preço (R$)"
              inputMode="decimal"
              value={form.preco}
              onChange={update('preco')}
              onBlur={() => {
                const preco = parsePrice(form.preco)
                if (preco) setForm((f) => ({ ...f, preco: priceToInput(preco) }))
              }}
              error={errors.preco}
              placeholder="0,00"
            />
            <div className="space-y-1.5">
              <label htmlFor="categoria" className="block text-sm font-medium">
                Categoria
              </label>
              <select
                id="categoria"
                value={form.categoria_id}
                onChange={update('categoria_id')}
                aria-invalid={Boolean(errors.categoria_id)}
                className={cn(
                  'h-11 w-full cursor-pointer rounded-lg border-2 bg-white px-3 text-base focus:border-gold focus:outline-none',
                  errors.categoria_id && 'border-destructive/60',
                )}
              >
                <option value="">Escolha…</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              {errors.categoria_id ? (
                <p className="text-sm text-destructive">{errors.categoria_id}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Nova categoria?{' '}
                  <Link to="/admin/produtos?aba=categorias" className="underline hover:text-gold-dark">
                    Crie em Categorias
                  </Link>
                </p>
              )}
            </div>
          </div>

          <Switch
            checked={form.disponivel}
            onChange={(disponivel) => setForm((f) => ({ ...f, disponivel }))}
            label="Mostrar na vitrine"
            description={
              form.disponivel
                ? 'Os clientes veem e podem encomendar.'
                : 'Desativado: some da vitrine, mas continua nos pedidos antigos.'
            }
          />
        </Card>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-3">
            <Button type="submit" loading={saving}>
              {isNew ? 'Cadastrar produto' : 'Salvar alterações'}
            </Button>
            <Button as={Link} to="/admin/produtos" variant="outline">
              Cancelar
            </Button>
          </div>
        </div>

        {!isNew && <DeleteProduct produto={produto} onDeactivate={() => save({ disponivel: false })} />}
      </div>

      <aside className="order-first lg:order-none">
        <Card className="p-5">
          <PhotoPicker
            src={currentPhoto}
            onPick={pickPhoto}
            error={errors.foto}
          />
        </Card>
      </aside>
    </form>
  )
}

export function ProdutoForm() {
  const { id } = useParams()
  const isNew = id === 'novo'

  const fetchData = useCallback(async () => {
    const [produto, categorias] = await Promise.all([isNew ? null : getProduct(id), listCategories()])
    return { produto, categorias }
  }, [id, isNew])
  const { data, loading, error } = useAsync(fetchData)

  return (
    <div className="mx-auto max-w-5xl">
      <Button as={Link} to="/admin/produtos" variant="ghost" size="sm" className="mb-4 -ml-3">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Produtos
      </Button>
      <h1 className="mb-6 text-3xl">{isNew ? 'Novo produto' : (data?.produto?.nome ?? 'Editar produto')}</h1>

      {loading && !data ? (
        <div className="h-96 animate-pulse rounded-lg bg-muted" aria-label="Carregando" />
      ) : error ? (
        <Card className="py-16 text-center">
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Button as={Link} to="/admin/produtos" variant="outline">
            Voltar para produtos
          </Button>
        </Card>
      ) : data.categorias.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="mb-1 text-lg">Crie uma categoria primeiro</p>
          <p className="mb-6 text-sm text-muted-foreground">Todo produto pertence a uma categoria (ex.: Bolos, Doces).</p>
          <Button as={Link} to="/admin/produtos?aba=categorias">
            Ir para Categorias
          </Button>
        </Card>
      ) : (
        // Chave pelo produto carregado: remonta só quando os dados do produto certo chegam
        <ProductEditor key={data.produto?.id ?? 'novo'} produto={data.produto} categorias={data.categorias} />
      )}
    </div>
  )
}