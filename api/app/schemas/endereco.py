import re
from typing import Optional

from pydantic import BaseModel, Field, field_validator


def _validar_cep(cep: str) -> str:
    digits = re.sub(r"[^0-9]", "", cep)
    if len(digits) != 8:
        raise ValueError("CEP inválido — informe 8 dígitos")
    return digits


def _validar_uf(uf: str) -> str:
    uf = uf.strip().upper()
    if not re.fullmatch(r"[A-Z]{2}", uf):
        raise ValueError("UF deve ter exatamente 2 letras")
    return uf


def _texto_obrigatorio(v: str) -> str:
    v = v.strip()
    if not v:
        raise ValueError("Campo obrigatório")
    return v


def _texto_opcional(v: Optional[str]) -> Optional[str]:
    if v is None:
        return None
    return v.strip() or None


class EnderecoCreate(BaseModel):
    rua: str = Field(max_length=150)
    numero: str = Field(max_length=10)
    complemento: Optional[str] = Field(default=None, max_length=100)
    bairro: str = Field(max_length=100)
    cep: str
    cidade: str = Field(max_length=100)
    uf: str

    obrigatorios = field_validator("rua", "numero", "bairro", "cidade")(_texto_obrigatorio)
    complemento_valido = field_validator("complemento")(_texto_opcional)
    cep_valido = field_validator("cep")(_validar_cep)
    uf_valida = field_validator("uf")(_validar_uf)


class EnderecoUpdate(BaseModel):
    rua: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None

    @field_validator("cep")
    @classmethod
    def cep_valido(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_cep(v)
        return v

    @field_validator("uf")
    @classmethod
    def uf_valida(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return _validar_uf(v)
        return v


class EnderecoRead(BaseModel):
    id: int
    rua: str
    numero: str
    complemento: Optional[str]
    bairro: str
    cep: str
    cidade: str
    uf: str
    cliente_id: int

    model_config = {"from_attributes": True}


class CepRead(BaseModel):
    """Endereço encontrado para um CEP (ViaCEP). Rua e bairro vêm vazios em CEPs gerais de cidade."""

    cep: str
    rua: Optional[str]
    bairro: Optional[str]
    cidade: str
    uf: str
