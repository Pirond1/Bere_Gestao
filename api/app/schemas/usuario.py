from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class TipoUsuarioRead(BaseModel):
    id: int
    descricao: str

    model_config = {"from_attributes": True}


class UsuarioCreate(BaseModel):
    email: EmailStr
    senha: str
    tipo_id: int = 2


class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    ativo: Optional[bool] = None
    tipo_id: Optional[int] = None


class UsuarioRead(BaseModel):
    id: int
    email: str
    ativo: bool
    tipo_id: int
    tipoUsuario: Optional[TipoUsuarioRead] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
