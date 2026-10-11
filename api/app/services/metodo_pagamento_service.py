from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.metodo_pagamento import MetodoPagamentoModel

# Descrições gravadas pela migration de seed — usadas nas regras de negócio
PIX = "pix"
CARTAO_CREDITO = "cartao_credito"


def buscar_por_descricao(db: Session, descricao: str) -> MetodoPagamentoModel:
    metodo = (
        db.query(MetodoPagamentoModel).filter(MetodoPagamentoModel.descricao == descricao).first()
    )
    if not metodo:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Método de pagamento '{descricao}' não encontrado — verifique as migrations",
        )
    return metodo