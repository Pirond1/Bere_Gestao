from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.agenda import AgendaDiaUpdate, DiaAgendaRead, DiaDisponivelRead
from app.services import agendamento_service

router = APIRouter(prefix="/agenda", tags=["Agenda"])


@router.get("/disponibilidade", response_model=list[DiaDisponivelRead])
def consultar_disponibilidade(
    dias: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Calendário de datas de retirada — consultado pelo cliente ao montar o pedido."""
    return agendamento_service.listar_disponibilidade(db, dias)


@router.get("/calendario", response_model=list[DiaAgendaRead])
def consultar_calendario(
    inicio: date,
    fim: date,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """Dias do período com capacidade, pedidos e bloqueio já resolvidos — calendário do painel."""
    return agendamento_service.calendario(db, inicio, fim)


@router.put("/{data}", response_model=DiaAgendaRead)
def ajustar_dia(
    data: date,
    dados: AgendaDiaUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """Ajusta capacidade e/ou bloqueio do dia. Enviar nulo volta a seguir a configuração."""
    return agendamento_service.ajustar_dia(db, data, dados)
