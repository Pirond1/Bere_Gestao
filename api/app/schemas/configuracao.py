import re
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.schemas.cliente import _validar_telefone


def _vazio(v):
    return v is None or (isinstance(v, str) and not v.strip())


def _perfil(v: str, dominio: str, padrao: str, nome: str) -> str:
    """Aceita "@perfil", "perfil" ou o link completo e guarda só o perfil."""
    v = v.strip()
    link = re.search(rf"{dominio}/(?:@)?([^/?#]+)", v, re.I)
    perfil = (link.group(1) if link else v).lstrip("@")
    if not re.fullmatch(padrao, perfil):
        raise ValueError(f"{nome} inválido — informe o @perfil ou o link")
    return perfil


def _validar_cnpj(v: str) -> str:
    cnpj = re.sub(r"\D", "", v)
    if len(cnpj) != 14 or cnpj == cnpj[0] * 14:
        raise ValueError("CNPJ inválido")
    for tamanho in (12, 13):
        pesos = list(range(tamanho - 7, 1, -1)) + list(range(9, 1, -1))
        soma = sum(int(d) * p for d, p in zip(cnpj[:tamanho], pesos))
        digito = 0 if soma % 11 < 2 else 11 - soma % 11
        if digito != int(cnpj[tamanho]):
            raise ValueError("CNPJ inválido")
    return cnpj


class ConfiguracaoUpdate(BaseModel):
    capacidade_produtiva_padrao: Optional[int] = Field(default=None, ge=0, le=500)
    antecedencia_minima_dias: Optional[int] = Field(default=None, ge=0, le=60)
    # Mínimo de 30 min (o valor usado e testado com o Mercado Pago até a BG-12); acima de 1 dia a vaga fica presa demais
    prazo_pagamento_minutos: Optional[int] = Field(default=None, ge=30, le=1440)
    dias_fechados: Optional[list[int]] = None
    endereco_retirada: Optional[str] = Field(default=None, max_length=255)
    horario_retirada: Optional[str] = Field(default=None, max_length=100)
    email_remetente_nome: Optional[str] = Field(default=None, max_length=100)
    # Vazio = sem reply-to (respostas vão para o endereço que envia)
    email_resposta: Optional[EmailStr] = None
    # Rodapé (BG-21): opcionais — texto vazio apaga e o item some do site
    whatsapp_loja: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    cnpj: Optional[str] = None

    @field_validator("whatsapp_loja", "instagram", "facebook", "tiktok", "cnpj", mode="before")
    @classmethod
    def texto_vazio(cls, v):
        return None if _vazio(v) else v

    @field_validator("whatsapp_loja")
    @classmethod
    def whatsapp_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_telefone(v) if v is not None else None

    @field_validator("instagram")
    @classmethod
    def instagram_valido(cls, v: Optional[str]) -> Optional[str]:
        return _perfil(v, r"instagram\.com", r"[A-Za-z0-9._]{1,30}", "Instagram") if v is not None else None

    @field_validator("tiktok")
    @classmethod
    def tiktok_valido(cls, v: Optional[str]) -> Optional[str]:
        return _perfil(v, r"tiktok\.com", r"[A-Za-z0-9._]{2,24}", "TikTok") if v is not None else None

    @field_validator("facebook")
    @classmethod
    def facebook_valido(cls, v: Optional[str]) -> Optional[str]:
        return _perfil(v, r"facebook\.com", r"[A-Za-z0-9.\-]{2,100}", "Facebook") if v is not None else None

    @field_validator("cnpj")
    @classmethod
    def cnpj_valido(cls, v: Optional[str]) -> Optional[str]:
        return _validar_cnpj(v) if v is not None else None

    @field_validator("email_remetente_nome")
    @classmethod
    def nome_remetente(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        v = v.strip()
        if not v:
            raise ValueError("Informe o nome que aparece como remetente")
        return v

    @field_validator("email_resposta", mode="before")
    @classmethod
    def resposta_vazia(cls, v):
        return None if isinstance(v, str) and not v.strip() else v

    @field_validator("dias_fechados")
    @classmethod
    def validar_dias_fechados(cls, v: Optional[list[int]]) -> Optional[list[int]]:
        if v is None:
            return None
        if any(dia < 0 or dia > 6 for dia in v):
            raise ValueError("Dia da semana inválido — use 0 (segunda) a 6 (domingo)")
        dias = sorted(set(v))
        if len(dias) == 7:
            raise ValueError("A loja precisa atender em pelo menos um dia da semana")
        return dias

    @field_validator("endereco_retirada", "horario_retirada")
    @classmethod
    def limpar_texto(cls, v: Optional[str]) -> Optional[str]:
        # Texto em branco = sem informação (fica fora do aviso de pedido pronto)
        if v is None:
            return None
        return v.strip() or None


class ConfiguracaoRead(BaseModel):
    id: int
    capacidade_produtiva_padrao: int
    antecedencia_minima_dias: int
    prazo_pagamento_minutos: int
    dias_fechados: list[int]
    endereco_retirada: Optional[str]
    horario_retirada: Optional[str]
    email_remetente_nome: str
    email_resposta: Optional[str]
    whatsapp_loja: Optional[str]
    instagram: Optional[str]
    facebook: Optional[str]
    tiktok: Optional[str]
    cnpj: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConfiguracaoPublicaRead(BaseModel):
    """O que o cliente precisa saber da configuração — nada além disso fica público."""

    prazo_pagamento_minutos: int
    # Contato e identificação da loja — Política de Privacidade e rodapé
    email_resposta: Optional[str] = None
    endereco_retirada: Optional[str] = None
    horario_retirada: Optional[str] = None
    whatsapp_loja: Optional[str] = None
    instagram: Optional[str] = None
    facebook: Optional[str] = None
    tiktok: Optional[str] = None
    cnpj: Optional[str] = None

    model_config = {"from_attributes": True}