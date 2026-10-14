"""Códigos de 6 dígitos enviados por e-mail (BG-15).

Guardamos só o HMAC do código com a SECRET_KEY: quem ler o banco não descobre os códigos.
Com 6 dígitos (1 milhão de combinações) e no máximo 5 tentativas, adivinhar é inviável.
"""

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.codigo_verificacao import CodigoVerificacaoModel

# Finalidades
CADASTRO = "cadastro"
RECUPERACAO_SENHA = "recuperacao_senha"
TROCA_EMAIL = "troca_email"

VALIDADE_MINUTOS = 15
MAX_TENTATIVAS = 5
INTERVALO_REENVIO_SEGUNDOS = 60


class AguardeReenvio(Exception):
    def __init__(self, segundos: int):
        self.segundos = segundos


def agora() -> datetime:
    # O banco grava datas em UTC, sem fuso
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(codigo: str) -> str:
    return hmac.new(settings.SECRET_KEY.encode(), codigo.encode(), hashlib.sha256).hexdigest()


def _ativos(db: Session, finalidade: str, email: str):
    return db.query(CodigoVerificacaoModel).filter(
        CodigoVerificacaoModel.finalidade == finalidade,
        CodigoVerificacaoModel.email == email,
        CodigoVerificacaoModel.usado_em.is_(None),
    )


def segundos_para_reenvio(db: Session, finalidade: str, email: str) -> int:
    ultimo = _ativos(db, finalidade, email).order_by(CodigoVerificacaoModel.id.desc()).first()
    if not ultimo:
        return 0
    enviado_em = ultimo.expira_em - timedelta(minutes=VALIDADE_MINUTOS)
    restante = INTERVALO_REENVIO_SEGUNDOS - (agora() - enviado_em).total_seconds()
    return max(int(restante) + 1, 0) if restante > 0 else 0


def gerar(
    db: Session,
    finalidade: str,
    email: str,
    usuario_id: Optional[int] = None,
    dados: Optional[dict] = None,
) -> tuple[str, CodigoVerificacaoModel]:
    """Cria um código novo e invalida os anteriores da mesma finalidade e e-mail.

    Levanta AguardeReenvio se o último foi enviado há menos de 60 s. Não faz commit.
    """
    espera = segundos_para_reenvio(db, finalidade, email)
    if espera:
        raise AguardeReenvio(espera)

    momento = agora()
    # Só o código mais recente vale
    _ativos(db, finalidade, email).update({CodigoVerificacaoModel.usado_em: momento})

    codigo = f"{secrets.randbelow(1_000_000):06d}"
    registro = CodigoVerificacaoModel(
        finalidade=finalidade,
        email=email,
        codigo_hash=_hash(codigo),
        tentativas=0,
        expira_em=momento + timedelta(minutes=VALIDADE_MINUTOS),
        usuario_id=usuario_id,
        dados=dados,
    )
    db.add(registro)
    db.flush()
    return codigo, registro


def ultimo_pendente(db: Session, finalidade: str, email: str) -> Optional[CodigoVerificacaoModel]:
    """Último código não usado — no reenvio, aproveita os dados do cadastro/troca pendente."""
    return _ativos(db, finalidade, email).order_by(CodigoVerificacaoModel.id.desc()).first()


def erro_aguarde(espera: AguardeReenvio) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=f"Aguarde {espera.segundos} s para pedir um novo código",
    )


def verificar(db: Session, finalidade: str, email: str, codigo: str) -> CodigoVerificacaoModel:
    """Confere o código e o marca como usado. Erros contam tentativa (máximo 5).

    Faz commit ao contar uma tentativa errada, para ela valer mesmo com o erro devolvido.
    """
    registro = ultimo_pendente(db, finalidade, email)
    if not registro or registro.expira_em < agora():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código expirado — peça um novo código",
        )
    if registro.tentativas >= MAX_TENTATIVAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Muitas tentativas erradas — peça um novo código",
        )
    if not hmac.compare_digest(registro.codigo_hash, _hash(codigo.strip())):
        registro.tentativas += 1
        db.commit()
        restantes = MAX_TENTATIVAS - registro.tentativas
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Código incorreto — {restantes} {'tentativa restante' if restantes == 1 else 'tentativas restantes'}"
                if restantes
                else "Código incorreto. Peça um novo código"
            ),
        )
    registro.usado_em = agora()
    return registro