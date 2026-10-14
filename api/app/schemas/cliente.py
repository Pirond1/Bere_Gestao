import re
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from pydantic import AliasPath, BaseModel, Field, field_validator

from app.core.tempo import hoje
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
    """Edição pela loja (RF_B01). E-mail e senha não: são o acesso do cliente e só ele muda."""

    nome: Optional[str] = Field(default=None, max_length=100)
    cpf: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None

    @field_validator("nome")
    @classmethod
    def nome_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Informe o nome do cliente")
        return v

    @field_validator("cpf")
    @classmethod
    def cpf_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_cpf(v) if v is not None else None

    @field_validator("data_nascimento")
    @classmethod
    def nascimento_valido(cls, v: Optional[date]) -> Optional[date]:
        if v is not None and v > hoje():
            raise ValueError("A data de nascimento não pode ser no futuro")
        return v

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



class ClienteResumoPedidosMixin(BaseModel):
    """Resumo de compras — conta só pedidos pagos, como os relatórios."""

    pedidos_pagos: int = 0
    total_gasto: Decimal = Decimal("0.00")
    ultimo_pedido: Optional[datetime] = None


class ClientePainelRead(ClienteResumoPedidosMixin):
    """Linha da lista de clientes no painel."""

    id: int
    nome: str
    email: str
    cpf: str
    telefone: Optional[str]
    data_assinatura: Optional[date]


class ClientePainelPagina(BaseModel):
    itens: list[ClientePainelRead]
    total: int
    pagina: int
    limite: int


class PedidoDoClienteRead(BaseModel):
    id: int
    data_pedido: datetime
    data_retirada: date = Field(validation_alias=AliasPath("agenda", "data"))
    status: str = Field(validation_alias=AliasPath("status", "descricao"))
    valor_total: Decimal

    model_config = {"from_attributes": True, "populate_by_name": True}


class ClienteDetalheRead(ClienteRead, ClienteResumoPedidosMixin):
    """Ficha do cliente no painel: cadastro, endereço, resumo e histórico de pedidos."""

    email: str = Field(validation_alias=AliasPath("usuario", "email"))
    pedidos: list[PedidoDoClienteRead] = []
