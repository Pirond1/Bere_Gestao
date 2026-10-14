from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, contains_eager, joinedload, selectinload

from app.models.agenda import AgendaModel
from app.models.cliente import ClienteModel
from app.models.item_pedido import ItemPedidoModel
from app.models.pagamento import PagamentoModel
from app.models.pedido import PedidoModel
from app.models.status_pedido import StatusPedidoModel
from app.schemas.pedido import PedidoCreate
from app.services import (
    agendamento_service,
    cliente_service,
    lgpd_service,
    pagamento_service,
    produto_service,
    status_pedido_service,
)


def criar(db: Session, cliente_id: int, dados: PedidoCreate) -> PedidoModel:
    """Cria o pedido reservando uma vaga na agenda do dia de retirada.

    Tudo acontece em uma única transação: se qualquer validação falhar,
    a vaga reservada é descartada junto com o pedido.
    """
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    lgpd_service.exigir_aceite(cliente)
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


def listar_painel(
    db: Session,
    status_pedido: Optional[list[str]] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    busca: Optional[str] = None,
    mais_recentes_primeiro: bool = False,
    pagina: int = 1,
    limite: int = 20,
) -> dict:
    """Lista de pedidos do painel da loja, pela data de retirada.

    A contagem por status ignora o filtro de status — alimenta as abas da tela.
    """
    query = (
        db.query(PedidoModel)
        .join(AgendaModel, PedidoModel.agenda_id == AgendaModel.id)
        .join(ClienteModel, PedidoModel.cliente_id == ClienteModel.id)
        .join(StatusPedidoModel, PedidoModel.status_id == StatusPedidoModel.id)
    )
    if data_inicio:
        query = query.filter(AgendaModel.data >= data_inicio)
    if data_fim:
        query = query.filter(AgendaModel.data <= data_fim)
    if busca and busca.strip():
        termo = busca.strip().lstrip("#")
        # Número busca pelo código do pedido; texto, pelo nome do cliente
        if termo.isdigit():
            query = query.filter(PedidoModel.id == int(termo))
        else:
            query = query.filter(ClienteModel.nome.ilike(f"%{termo}%"))

    contagem = dict(
        query.with_entities(StatusPedidoModel.descricao, func.count(PedidoModel.id))
        .group_by(StatusPedidoModel.descricao)
        .all()
    )

    if status_pedido:
        query = query.filter(StatusPedidoModel.descricao.in_(status_pedido))

    ordem = (
        (AgendaModel.data.desc(), PedidoModel.data_pedido.desc())
        if mais_recentes_primeiro
        else (AgendaModel.data.asc(), PedidoModel.data_pedido.asc())
    )
    total = query.count()
    itens = (
        query.options(
            # Evita uma consulta por pedido ao montar a lista
            contains_eager(PedidoModel.agenda),
            contains_eager(PedidoModel.cliente).joinedload(ClienteModel.usuario),
            contains_eager(PedidoModel.status),
            selectinload(PedidoModel.itens).joinedload(ItemPedidoModel.produto),
            selectinload(PedidoModel.pagamentos).joinedload(PagamentoModel.metodo),
            selectinload(PedidoModel.pagamentos).joinedload(PagamentoModel.status),
            joinedload(PedidoModel.avaliacao),
        )
        .order_by(*ordem)
        .offset((pagina - 1) * limite)
        .limit(limite)
        .all()
    )

    return {
        "itens": itens,
        "total": total,
        "pagina": pagina,
        "limite": limite,
        "contagem_por_status": contagem,
    }


def buscar_por_id(db: Session, pedido_id: int) -> PedidoModel:
    pedido = db.query(PedidoModel).filter(PedidoModel.id == pedido_id).first()
    if not pedido:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pedido não encontrado",
        )
    return pedido


def _filtro_novos():
    """Pedido novo: pago, ainda em andamento e que a loja nunca abriu no painel."""
    return (
        PedidoModel.visualizado_em.is_(None),
        PedidoModel.status.has(
            StatusPedidoModel.descricao.in_(status_pedido_service.EM_ANDAMENTO)
        ),
    )


def _marcar_visto(pedido: PedidoModel) -> None:
    # Guarda só a primeira vez; o banco grava datas em UTC
    if pedido.visualizado_em is None:
        pedido.visualizado_em = datetime.now(timezone.utc).replace(tzinfo=None)


def contar_novos(db: Session) -> int:
    return db.query(PedidoModel).filter(*_filtro_novos()).count()


def marcar_visualizado(db: Session, pedido_id: int) -> PedidoModel:
    """A loja abriu o detalhe do pedido — ele deixa de contar como novo."""
    pedido = buscar_por_id(db, pedido_id)
    _marcar_visto(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


def marcar_todos_visualizados(db: Session) -> int:
    """Zera o indicador de pedidos novos. Retorna quantos foram marcados."""
    novos = db.query(PedidoModel).filter(*_filtro_novos()).all()
    for pedido in novos:
        _marcar_visto(pedido)
    db.commit()
    return len(novos)


def marcar_avisado(db: Session, pedido_id: int) -> PedidoModel:
    """A loja avisou o cliente que o pedido está pronto. Guarda o último aviso (admin)."""
    pedido = buscar_por_id(db, pedido_id)
    if pedido.status.descricao != status_pedido_service.PRONTO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Só é possível avisar o cliente quando o pedido está pronto para retirada",
        )
    pedido.avisado_em = datetime.now(timezone.utc).replace(tzinfo=None)
    _marcar_visto(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


def _mover_no_fluxo(db: Session, pedido: PedidoModel, passo: int) -> PedidoModel:
    novo = status_pedido_service.FLUXO_PRODUCAO[
        status_pedido_service.FLUXO_PRODUCAO.index(pedido.status.descricao) + passo
    ]
    pedido.status_id = status_pedido_service.buscar_por_descricao(db, novo).id
    # Mexer no pedido (ex.: botão rápido da lista) significa que a loja já o viu
    _marcar_visto(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


def avancar_status(db: Session, pedido_id: int) -> PedidoModel:
    """Leva o pedido para a próxima etapa: confirmado → em produção → pronto → retirado (admin)."""
    pedido = buscar_por_id(db, pedido_id)
    atual = pedido.status.descricao
    fluxo = status_pedido_service.FLUXO_PRODUCAO
    if atual not in fluxo:
        mensagens = {
            status_pedido_service.AGUARDANDO_PAGAMENTO: (
                "O pedido ainda não foi pago — ele é confirmado automaticamente quando o pagamento for aprovado"
            ),
            status_pedido_service.CANCELADO: "Pedido cancelado não pode mudar de status",
        }
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=mensagens[atual])
    if atual == fluxo[-1]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O pedido já foi retirado",
        )
    return _mover_no_fluxo(db, pedido, +1)


def voltar_status(db: Session, pedido_id: int) -> PedidoModel:
    """Desfaz a última etapa, para corrigir um clique errado (admin)."""
    pedido = buscar_por_id(db, pedido_id)
    atual = pedido.status.descricao
    fluxo = status_pedido_service.FLUXO_PRODUCAO
    # "Confirmado" é a primeira etapa: antes dela só existe o pagamento
    if atual not in fluxo[1:]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há etapa anterior para voltar neste pedido",
        )
    if atual == status_pedido_service.ENTREGUE and pedido.avaliacao:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O cliente já avaliou este pedido — ele não pode voltar para antes da retirada",
        )
    return _mover_no_fluxo(db, pedido, -1)


def cancelar(
    db: Session, pedido_id: int, e_admin: bool = False, motivo: Optional[str] = None
) -> PedidoModel:
    """Cancela o pedido e devolve a vaga do dia para outro cliente.

    Se já estiver pago, estorna no Mercado Pago; se o estorno falhar, nada é cancelado.
    """
    pedido = buscar_por_id(db, pedido_id)
    atual = pedido.status.descricao
    if atual == status_pedido_service.CANCELADO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já está cancelado",
        )
    if atual == status_pedido_service.ENTREGUE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pedido já retirado não pode ser cancelado",
        )
    if not e_admin and atual not in status_pedido_service.CANCELAVEIS_PELO_CLIENTE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este pedido já entrou em produção e não pode mais ser cancelado",
        )

    cancelado = status_pedido_service.buscar_por_descricao(db, status_pedido_service.CANCELADO)
    pagamento_service.encerrar(db, pedido)
    agendamento_service.liberar_vaga(db, pedido.agenda)
    pedido.status_id = cancelado.id
    pedido.motivo_cancelamento = motivo
    db.commit()
    db.refresh(pedido)
    return pedido