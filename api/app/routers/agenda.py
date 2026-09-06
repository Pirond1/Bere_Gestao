from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.agenda import AgendaCreate, AgendaRead, AgendaUpdate, DiaDisponivelRead
from app.services import agendamento_service

router = APIRouter(prefix="/agenda", tags=["Agenda"])


@router.get("/disponibilidade", response_model=list[DiaDisponivelRead])
def consultar_disponibilidade(
    dias: int = Query(default=30, ge=1, le=90),
    db: Session = Depends(get_db),
):
    """Calendário de datas de retirada — consultado pelo cliente ao montar o pedido."""
    return agendamento_service.listar_disponibilidade(db, dias)


@router.get("/", response_model=list[AgendaRead])
def listar_agenda(
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return agendamento_service.listar(db, data_inicio, data_fim)


@router.post("/", response_model=AgendaRead, status_code=status.HTTP_201_CREATED)
def definir_capacidade(
    dados: AgendaCreate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    """Cadastra ou sobrescreve a capacidade de uma data específica."""
    return agendamento_service.definir(db, dados)


@router.put("/{agenda_id}", response_model=AgendaRead)
def atualizar_agenda(
    agenda_id: int,
    dados: AgendaUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return agendamento_service.atualizar(db, agenda_id, dados)