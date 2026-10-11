from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.status_pagamento import StatusPagamentoModel

# Descrições gravadas pela migration de seed — usadas nas regras de negócio
PENDENTE = "pendente"
APROVADO = "aprovado"
RECUSADO = "recusado"
CANCELADO = "cancelado"
EXPIRADO = "expirado"
ESTORNADO = "estornado"


def buscar_por_descricao(db: Session, descricao: str) -> StatusPagamentoModel:
    status_pagamento = (
        db.query(StatusPagamentoModel).filter(StatusPagamentoModel.descricao == descricao).first()
    )
    if not status_pagamento:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Status de pagamento '{descricao}' não encontrado — verifique as migrations",
        )
    return status_pagamento