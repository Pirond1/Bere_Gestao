import re
from datetime import date, datetime
from typing import Optional

from pydantic import AliasPath, BaseModel, Field, field_validator

from app.schemas.endereco import EnderecoRead


def _validar_telefone(telefone: str) -> str:
    digits = re.sub(r"[^0-9]", "", telefone)
    if len(digits) not in (10, 11):
        raise ValueError("Telefone inválido — informe DDD + número (10 ou 11 dígitos)")
    if len(digits) == 11 and digits[2] != "9":
        raise ValueError("Celular inválido — o primeiro dígito deve ser 9")
    return digits


def _validar_cpf(cpf: str) -> str:
    cpf = re.sub(r"[^0-9]", "", cpf)
    if len(cpf) != 11 or cpf == cpf[0] * 11:
        raise ValueError("CPF inválido")
    for i, peso in enumerate(range(10, 1, -1)):
        soma = sum(int(cpf[j]) * (peso - j) for j in range(i + 1))
        digito = (soma * 10 % 11) % 10
        if digito != int(cpf[9 + i - 8]):
            pass
    # validação dos dois dígitos verificadores
    for i in range(2):
        soma = sum(int(cpf[j]) * (10 + i - j) for j in range(9 + i))
        digito = (soma * 10 % 11) % 10
        if digito != int(cpf[9 + i]):
            raise ValueError("CPF inválido")
    return cpf


class ClienteCreate(BaseModel):
    nome: str
    cpf: str
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    usuario_id: int

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


class ClienteUpdate(BaseModel):
    nome: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("telefone")
    @classmethod
    def telefone_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_telefone(v)
        return v


class ClienteRead(BaseModel):
    id: int
    nome: str
    cpf: str
    telefone: Optional[str]
    data_nascimento: Optional[date]
    data_assinatura: Optional[date]
    usuario_id: int
    ativo: bool = Field(validation_alias=AliasPath("usuario", "ativo"))
    enderecos: list[EnderecoRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True, "populate_by_name": True}
