from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator

from app.schemas.cliente import ClienteRead, _validar_cpf, _validar_telefone


class LoginInput(BaseModel):
    email: EmailStr
    senha: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MeRead(BaseModel):
    email: str
    nome: Optional[str] = None


class RegistroInput(BaseModel):
    # campos de Usuario
    email: EmailStr
    senha: str
    # campos de Cliente
    nome: str
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("cpf")
    @classmethod
    def cpf_valido(cls, v: str) -> str:
        return _validar_cpf(v)

    @field_validator("telefone")
    @classmethod
    def telefone_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_telefone(v)
        return v


class RegistroRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    cliente: ClienteRead


class AlterarContaInput(BaseModel):
    # campos de Usuario
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    # campos de Cliente (ignorados se o usuário for admin)
    nome: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("telefone")
    @classmethod
    def telefone_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_telefone(v)
        return v


class AlterarContaRead(BaseModel):
    email: str
    cliente: Optional[ClienteRead] = None

    model_config = {"from_attributes": True}