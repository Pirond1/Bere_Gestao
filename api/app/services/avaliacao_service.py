from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.avaliacao import AvaliacaoModel
from app.schemas.avaliacao import AvaliacaoCreate
from app.services import pedido_service, status_pedido_service


def criar(db: Session, pedido_id: int, dados: AvaliacaoCreate) -> AvaliacaoModel:
    """Registra a nota NPS. Só é aceita depois que o pedido foi entregue (RF_S02)."""
    pedido = pedido_service.buscar_por_id(db, pedido_id)

    if pedido.status.descricao != status_pedido_service.ENTREGUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A avaliação só pode ser enviada após a entrega do pedido",
        )
    if pedido.avaliacao:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já foi avaliado",
        )

    avaliacao = AvaliacaoModel(pedido_id=pedido.id, **dados.model_dump())
    db.add(avaliacao)
    db.commit()
    db.refresh(avaliacao)
    return avaliacao


def buscar_por_pedido(db: Session, pedido_id: int) -> AvaliacaoModel:
    avaliacao = db.query(AvaliacaoModel).filter(AvaliacaoModel.pedido_id == pedido_id).first()
    if not avaliacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este pedido ainda não foi avaliado",
        )
    return avaliacao