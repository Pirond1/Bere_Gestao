from datetime import date
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.agenda import AgendaModel
from app.models.item_pedido import ItemPedidoModel
from app.models.pedido import PedidoModel
from app.schemas.pedido import PedidoCreate
from app.services import (
    agendamento_service,
    cliente_service,
    pagamento_service,
    produto_service,
    status_pedido_service,
)


def criar(db: Session, cliente_id: int, dados: PedidoCreate) -> PedidoModel:
    """Cria o pedido reservando uma vaga na agenda do dia de retirada.

    Tudo acontece em uma única transação: se qualquer validação falhar,
    a vaga reservada é descartada junto com o pedido.
    """
    cliente_service.buscar_por_id(db, cliente_id)
    # Reserva a vaga primeiro — se o dia estiver cheio, nem monta o pedido
    agenda = agendamento_service.reservar(db, dados.data_retirada)
    status_inicial = status_pedido_service.buscar_por_descricao(
        db, status_pedido_service.AGUARDANDO_PAGAMENTO
    )

    pedido = PedidoModel(
        cliente_id=cliente_id,
        agenda_id=agenda.id,
        status_id=status_inicial.id,
        valor_total=Decimal("0.00"),
        observacoes=dados.observacoes,
    )
    db.add(pedido)
    db.flush()

    valor_total = Decimal("0.00")
    for item in dados.itens:
        produto = produto_service.buscar_por_id(db, item.produto_id)
        if not produto.disponivel:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"O produto '{produto.nome}' não está disponível",
            )
        subtotal = produto.preco * item.quantidade
        db.add(
            ItemPedidoModel(
                pedido_id=pedido.id,
                produto_id=produto.id,
                quantidade=item.quantidade,
                preco_unitario=produto.preco,
                subtotal=subtotal,
            )
        )
        valor_total += subtotal

    pedido.valor_total = valor_total
    db.commit()
    db.refresh(pedido)
    return pedido


def listar(
    db: Session,
    cliente_id: Optional[int] = None,
    status_id: Optional[int] = None,
    data_retirada: Optional[date] = None,
    pagina: int = 1,
    limite: int = 20,
) -> list[PedidoModel]:
    offset = (pagina - 1) * limite
    query = db.query(PedidoModel)
    if cliente_id:
        query = query.filter(PedidoModel.cliente_id == cliente_id)
    if status_id:
        query = query.filter(PedidoModel.status_id == status_id)
    if data_retirada:
        query = query.join(AgendaModel).filter(AgendaModel.data == data_retirada)
    return (
        query.order_by(PedidoModel.data_pedido.desc()).offset(offset).limit(limite).all()
    )


def buscar_por_id(db: Session, pedido_id: int) -> PedidoModel:
    pedido = db.query(PedidoModel).filter(PedidoModel.id == pedido_id).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado",
        )
    return pedido


def atualizar_status(db: Session, pedido_id: int, status_id: int) -> PedidoModel:
    """Altera o status do pedido (admin). Cancelar por aqui devolve a vaga e estorna o pagamento."""
    pedido = buscar_por_id(db, pedido_id)
    if pedido.status.descricao == status_pedido_service.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pedido cancelado não pode mudar de status",
        )

    novo_status = status_pedido_service.buscar_por_id(db, status_id)
    if novo_status.descricao == status_pedido_service.CANCELADO:
        pagamento_service.encerrar(db, pedido)
        agendamento_service.liberar_vaga(db, pedido.agenda)

    pedido.status_id = novo_status.id
    db.commit()
    db.refresh(pedido)
    return pedido


def cancelar(db: Session, pedido_id: int, e_admin: bool = False) -> PedidoModel:
    """Cancela o pedido e devolve a vaga do dia para outro cliente.

    Se já estiver pago, estorna no Mercado Pago; se o estorno falhar, nada é cancelado.
    """
    pedido = buscar_por_id(db, pedido_id)
    if pedido.status.descricao == status_pedido_service.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já está cancelado",
        )
    if not e_admin and pedido.status.descricao not in status_pedido_service.CANCELAVEIS_PELO_CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já entrou em produção e não pode mais ser cancelado",
        )

    cancelado = status_pedido_service.buscar_por_descricao(db, status_pedido_service.CANCELADO)
    pagamento_service.encerrar(db, pedido)
    agendamento_service.liberar_vaga(db, pedido.agenda)
    pedido.status_id = cancelado.id
    db.commit()
    db.refresh(pedido)
    return pedido