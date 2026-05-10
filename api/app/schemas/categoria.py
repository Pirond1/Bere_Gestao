from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CategoriaCreate(BaseModel):
    nome: str
    descricao: Optional[str] = None


class CategoriaUpdate(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None


class CategoriaRead(BaseModel):
    id: int
    nome: str
    descricao: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}