from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.categoria import CategoriaRead


def _limpar_nome(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Informe o nome do produto")
    return v


def _limpar_descricao(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    return v.strip() or None


def _validar_preco(v: Decimal) -> Decimal:
    if v <= 0:
        raise ValueError("O preço deve ser maior que zero")
    return round(v, 2)


# A foto não entra aqui: é enviada à parte em POST /produtos/{id}/foto
class ProdutoCreate(BaseModel):
    nome: str = Field(max_length=100)
    descricao: Optional[str] = None
    preco: Decimal
    disponivel: bool = True
    categoria_id: int

    nome_valido = field_validator("nome")(_limpar_nome)
    descricao_valida = field_validator("descricao")(_limpar_descricao)
    preco_valido = field_validator("preco")(_validar_preco)


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, max_length=100)
    descricao: Optional[str] = None
    preco: Optional[Decimal] = None
    disponivel: Optional[bool] = None
    categoria_id: Optional[int] = None

    @field_validator("nome")
    @classmethod
    def nome_valido(cls, v: Optional[str]) -> Optional[str]:
        return _limpar_nome(v) if v is not None else None

    descricao_valida = field_validator("descricao")(_limpar_descricao)

    @field_validator("preco")
    @classmethod
    def preco_valido(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        return _validar_preco(v) if v is not None else None


class ProdutoRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    preco: Decimal
    # Caminho da foto na API (ex.: /uploads/produtos/3-ab12cd34.webp)
    foto: Optional[str]
    disponivel: bool
    categoria_id: int
    categoria: CategoriaRead
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
