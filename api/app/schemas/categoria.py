from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _limpar_nome(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Informe o nome da categoria")
    return v


def _limpar_descricao(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    return v.strip() or None


class CategoriaCreate(BaseModel):
    nome: str = Field(max_length=100)
    descricao: Optional[str] = Field(default=None, max_length=255)

    nome_valido = field_validator("nome")(_limpar_nome)
    descricao_valida = field_validator("descricao")(_limpar_descricao)


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, max_length=100)
    descricao: Optional[str] = Field(default=None, max_length=255)

    @field_validator("nome")
    @classmethod
    def nome_valido(cls, v: Optional[str]) -> Optional[str]:
        return _limpar_nome(v) if v is not None else None

    descricao_valida = field_validator("descricao")(_limpar_descricao)


class CategoriaRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
