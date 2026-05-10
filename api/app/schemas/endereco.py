import re
from typing import Optional

from pydantic import BaseModel, field_validator


def _validar_cep(cep: str) -> str:
    digits = re.sub(r"[^0-9]", "", cep)
    if len(digits) != 8:
        raise ValueError("CEP inválido — informe 8 dígitos")
    return digits


class EnderecoCreate(BaseModel):
    rua: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cep: str
    cidade: str
    uf: str

    @field_validator("cep")
    @classmethod
    def cep_valido(cls, v: str) -> str:
        return _validar_cep(v)

    @field_validator("uf")
    @classmethod
    def uf_valida(cls, v: str) -> str:
        if len(v.strip()) != 2:
            raise ValueError("UF deve ter exatamente 2 letras")
        return v.upper()


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
            if len(v.strip()) != 2:
                raise ValueError("UF deve ter exatamente 2 letras")
            return v.upper()
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