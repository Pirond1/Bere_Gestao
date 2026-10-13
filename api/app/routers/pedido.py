from datetime import date
from typing import Optional

from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_admin_atual,
    get_cliente_atual,
    get_usuario_atual,
    verificar_acesso_cliente,
)
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.pedido import (
    PedidoCancelar,
    NovosPedidosRead,
    PedidoCreate,
    PedidoPainelPagina,
    PedidoPainelRead,
    PedidoRead,
)
from app.services import pedido_service

router = APIRouter(prefix="/pedidos", tags=["Pedidos"])


@router.post("/", response_model=PedidoRead, status_code=status.HTTP_201_CREATED)
def criar_pedido(
    dados: PedidoCreate,
    db: Session = Depends(get_db),
    cliente_atual: ClienteModel = Depends(get_cliente_atual),
):
    return pedido_service.criar(db, cliente_atual.id, dados)


@router.get("/", response_model=list[PedidoRead])
def listar_pedidos(
    status_id: Optional[int] = None,
    data_retirada: Optional[date] = None,
    cliente_id: Optional[int] = None,
    pagina: int = 1,
    limite: int = 20,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Admin enxerga todos os pedidos; cliente enxerga somente os próprios."""
    e_admin = usuario_atual.tipoUsuario.descricao == "admin"
    if not e_admin:
        cliente_id = get_cliente_atual(usuario_atual).id
    return pedido_service.listar(db, cliente_id, status_id, data_retirada, pagina, limite)


# Rotas do painel antes de "/{pedido_id}" para "painel" não ser lido como id
@router.get("/painel", response_model=PedidoPainelPagina)
def listar_pedidos_painel(
    status_pedido: Optional[list[str]] = Query(default=None, alias="status"),
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    busca: Optional[str] = Query(default=None, max_length=100),
    mais_recentes_primeiro: bool = False,
    pagina: int = Query(default=1, ge=1),
    limite: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """Pedidos para a loja, ordenados pela data de retirada. `status` aceita vários valores."""
    return pedido_service.listar_painel(
        db, status_pedido, data_inicio, data_fim, busca, mais_recentes_primeiro, pagina, limite
    )


@router.get("/painel/novos", response_model=NovosPedidosRead)
def contar_pedidos_novos(db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """Quantidade para o indicador do menu: pagos, em andamento e ainda não abertos."""
    return {"quantidade": pedido_service.contar_novos(db)}


@router.post("/painel/marcar-vistos", response_model=NovosPedidosRead)
def marcar_todos_vistos(db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """Zera o indicador. Retorna quantos pedidos foram marcados."""
    return {"quantidade": pedido_service.marcar_todos_visualizados(db)}


@router.get("/painel/{pedido_id}", response_model=PedidoPainelRead)
def buscar_pedido_painel(pedido_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return pedido_service.buscar_por_id(db, pedido_id)


@router.patch("/{pedido_id}/visualizado", response_model=PedidoPainelRead)
def marcar_pedido_visualizado(pedido_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """A loja abriu o detalhe do pedido — ele deixa de ser novo."""
    return pedido_service.marcar_visualizado(db, pedido_id)


@router.patch("/{pedido_id}/avisado", response_model=PedidoPainelRead)
def marcar_pedido_avisado(pedido_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """A loja abriu o WhatsApp para avisar que o pedido está pronto para retirada."""
    return pedido_service.marcar_avisado(db, pedido_id)


@router.get("/{pedido_id}", response_model=PedidoRead)
def buscar_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    return pedido


@router.patch("/{pedido_id}/avancar", response_model=PedidoPainelRead)
def avancar_status_pedido(pedido_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """Próxima etapa: confirmado → em produção → pronto → retirado."""
    return pedido_service.avancar_status(db, pedido_id)


@router.patch("/{pedido_id}/voltar", response_model=PedidoPainelRead)
def voltar_status_pedido(pedido_id: int, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    """Desfaz a última etapa — para corrigir um clique errado."""
    return pedido_service.voltar_status(db, pedido_id)


@router.patch("/{pedido_id}/cancelar", response_model=PedidoRead)
def cancelar_pedido(
    pedido_id: int,
    dados: Optional[PedidoCancelar] = Body(default=None),
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    pedido = pedido_service.buscar_por_id(db, pedido_id)
    verificar_acesso_cliente(usuario_atual, pedido.cliente)
    e_admin = usuario_atual.tipoUsuario.descricao == "admin"
    # Só a loja registra motivo; o cliente cancela o próprio pedido sem precisar explicar
    motivo = dados.motivo if dados and e_admin else None
    return pedido_service.cancelar(db, pedido_id, e_admin, motivo)