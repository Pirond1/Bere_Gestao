"""Fotos de produtos enviadas pelo painel: valida, otimiza e guarda no disco da API."""

import io
import uuid
from typing import Optional

from fastapi import HTTPException, UploadFile, status
from PIL import Image, ImageOps, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from app.core.config import UPLOADS_DIR, UPLOADS_URL

TAMANHO_MAXIMO_BYTES = 10 * 1024 * 1024
FORMATOS_ACEITOS = {"JPEG", "PNG", "WEBP"}
# Lado maior da foto salva — sobra para a tela do produto e deixa a vitrine leve no celular
LADO_MAXIMO_PX = 1200
QUALIDADE_WEBP = 82
# Protege contra arquivos pequenos que descompactam em imagens gigantes
Image.MAX_IMAGE_PIXELS = 50_000_000

PASTA_PRODUTOS = "produtos"


def _erro(mensagem: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensagem)


async def _ler_limitado(arquivo: UploadFile) -> bytes:
    conteudo = await arquivo.read(TAMANHO_MAXIMO_BYTES + 1)
    if len(conteudo) > TAMANHO_MAXIMO_BYTES:
        raise _erro("A foto pode ter no máximo 10 MB")
    if not conteudo:
        raise _erro("Arquivo vazio")
    return conteudo


def _otimizar(conteudo: bytes) -> bytes:
    """Abre a imagem, corrige a rotação do celular, reduz e converte para WebP."""
    try:
        imagem = Image.open(io.BytesIO(conteudo))
        if imagem.format not in FORMATOS_ACEITOS:
            raise _erro("Formato não suportado — envie JPG, PNG ou WebP")
        imagem.load()
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError):
        raise _erro("Não foi possível ler a imagem — envie JPG, PNG ou WebP")

    # Fotos do celular vêm "deitadas" com a rotação só nos metadados (EXIF)
    imagem = ImageOps.exif_transpose(imagem)
    if imagem.mode not in ("RGB", "RGBA"):
        imagem = imagem.convert("RGBA" if "A" in imagem.getbands() else "RGB")
    imagem.thumbnail((LADO_MAXIMO_PX, LADO_MAXIMO_PX), Image.Resampling.LANCZOS)

    saida = io.BytesIO()
    # Salvar de novo descarta os metadados (localização do celular, por exemplo)
    imagem.save(saida, format="WEBP", quality=QUALIDADE_WEBP, method=6)
    return saida.getvalue()


async def salvar_foto_produto(arquivo: UploadFile, produto_id: int) -> str:
    """Grava a foto otimizada e devolve o caminho público (ex.: /uploads/produtos/3-ab12cd34.webp)."""
    # Processar a imagem pesa na CPU — fora do loop para não travar as outras requisições
    dados = await run_in_threadpool(_otimizar, await _ler_limitado(arquivo))
    pasta = UPLOADS_DIR / PASTA_PRODUTOS
    pasta.mkdir(parents=True, exist_ok=True)
    # Nome novo a cada envio: o navegador não mostra a foto antiga do cache
    nome = f"{produto_id}-{uuid.uuid4().hex[:8]}.webp"
    (pasta / nome).write_bytes(dados)
    return f"{UPLOADS_URL}/{PASTA_PRODUTOS}/{nome}"


def remover(caminho: Optional[str]) -> None:
    """Apaga do disco uma foto enviada pelo painel. Links externos e caminhos estranhos são ignorados."""
    if not caminho or not caminho.startswith(f"{UPLOADS_URL}/"):
        return
    arquivo = (UPLOADS_DIR / caminho.removeprefix(f"{UPLOADS_URL}/")).resolve()
    # Nunca sai da pasta de uploads, mesmo com um caminho adulterado no banco
    if UPLOADS_DIR.resolve() in arquivo.parents:
        arquivo.unlink(missing_ok=True)
