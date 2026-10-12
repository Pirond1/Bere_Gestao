from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, field_validator

from app.schemas.categoria import CategoriaRead


class ProdutoCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None
    preco: Decimal
    foto: Optional[str] = None
    disponivel: bool = True
    categoria_id: int = None

    @field_validator("preco")
    @classmethod
    def preco_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("O preço deve ser maior que zero")
        return round(v, 2)


class ProdutoUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    preco: Optional[Decimal] = None
    foto: Optional[str] = None
    disponivel: Optional[bool] = None
    categoria_id: Optional[int] = None

    @field_validator("preco")
    @classmethod
    def preco_positivo(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("O preço deve ser maior que zero")
        return round(v, 2) if v is not None else v


class ProdutoRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    preco: Decimal
    foto: Optional[str]
    disponivel: bool
    categoria_id: int
    categoria: CategoriaRead
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}