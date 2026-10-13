from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.cliente import ClienteRead, _validar_cpf, _validar_telefone

SENHA_MINIMA = 8


def _validar_senha(senha: str) -> str:
    if len(senha) < SENHA_MINIMA:
        raise ValueError(f"A senha precisa ter pelo menos {SENHA_MINIMA} caracteres")
    return senha


def _validar_nascimento(data: Optional[date]) -> Optional[date]:
    if data is not None and data > date.today():
        raise ValueError("A data de nascimento não pode ser no futuro")
    return data


def _validar_nome(nome: str) -> str:
    nome = nome.strip()
    if not nome:
        raise ValueError("Informe seu nome")
    return nome


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

    senha_valida = field_validator("senha")(_validar_senha)
    nome_valido = field_validator("nome")(_validar_nome)
    nascimento_valido = field_validator("data_nascimento")(_validar_nascimento)

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
    # Obrigatória para trocar e-mail, senha ou CPF — sessão aberta sozinha não basta para tomar a conta
    senha_atual: Optional[str] = None
    # campos de Cliente (ignorados se o usuário for admin)
    nome: Optional[str] = Field(default=None, max_length=100)
    # O próprio cliente corrige o CPF (LGPD art. 18, III) — identidade da conta, por isso pede senha
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("senha")
    @classmethod
    def senha_valida(cls, v: Optional[str]) -> Optional[str]:
        return _validar_senha(v) if v is not None else None

    @field_validator("nome")
    @classmethod
    def nome_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_nome(v) if v is not None else None

    @field_validator("cpf")
    @classmethod
    def cpf_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_cpf(v) if v is not None else None

    nascimento_valido = field_validator("data_nascimento")(_validar_nascimento)

    @field_validator("telefone")
    @classmethod
    def telefone_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_telefone(v)
        return v


# Também é a resposta de GET /auth/perfil
class AlterarContaRead(BaseModel):
    email: str
    cliente: Optional[ClienteRead] = None

    model_config = {"from_attributes": True}