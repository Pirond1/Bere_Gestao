from datetime import date, datetime
from typing import Annotated, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.core.tempo import hoje
from app.schemas.cliente import ClienteRead, _validar_cpf, _validar_telefone
from app.services import senha_service

# Código de 6 dígitos enviado por e-mail (BG-15)
Codigo = Annotated[str, Field(pattern=r"^\d{6}$")]


def _validar_nascimento(data: Optional[date]) -> Optional[date]:
    if data is not None and data > hoje():
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


class MensagemRead(BaseModel):
    mensagem: str


class CodigoEnviadoRead(BaseModel):
    """O código foi enviado — a tela pede os 6 dígitos e controla o "reenviar"."""

    email: str
    expira_em: datetime
    reenvio_em_segundos: int


class RegistroInput(BaseModel):
    # campos de Usuario
    email: EmailStr
    senha: str
    # campos de Cliente
    nome: str = Field(max_length=100)
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

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

    @model_validator(mode="after")
    def senha_forte(self):
        # Depois dos campos: a força depende do nome, e-mail e CPF
        erro = senha_service.problema(self.senha, self.nome, self.email, self.cpf)
        if erro:
            raise ValueError(erro)
        return self


class ConfirmarCadastroInput(BaseModel):
    email: EmailStr
    codigo: Codigo


class ReenviarCodigoInput(BaseModel):
    email: EmailStr


class RegistroRead(BaseModel):
    access_token: str
    token_type: str = "bearer"
    cliente: ClienteRead


class RedefinirSenhaInput(BaseModel):
    email: EmailStr
    codigo: Codigo
    nova_senha: str


class SolicitarTrocaEmailInput(BaseModel):
    novo_email: EmailStr
    senha_atual: str


class ConfirmarCodigoInput(BaseModel):
    codigo: Codigo


class AlterarContaInput(BaseModel):
    """O e-mail não muda aqui: a troca confirma o novo endereço por código (/auth/email/...)."""

    senha: Optional[str] = None
    # Obrigatória para trocar senha ou CPF — sessão aberta sozinha não basta para tomar a conta
    senha_atual: Optional[str] = None
    # campos de Cliente (ignorados se o usuário for admin)
    nome: Optional[str] = Field(default=None, max_length=100)
    # O próprio cliente corrige o CPF (LGPD art. 18, III) — identidade da conta, por isso pede senha
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

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
    # Só quando a senha muda: as sessões antigas caem e esta continua com o token novo
    access_token: Optional[str] = None

    model_config = {"from_attributes": True}
