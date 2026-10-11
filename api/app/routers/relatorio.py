from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.relatorio import RelatorioNpsRead, RelatorioVendasRead, RetiradaDiaRead
from app.services import relatorio_service

router = APIRouter(prefix="/relatorios", tags=["Relatórios"], dependencies=[Depends(get_admin_atual)])


@router.get("/vendas", response_model=RelatorioVendasRead)
def relatorio_vendas(inicio: date, fim: date, db: Session = Depends(get_db)):
    """Datas no formato AAAA-MM-DD, consideradas no horário de Brasília (ambas inclusivas)."""
    return relatorio_service.vendas(db, inicio, fim)


@router.get("/proximas-retiradas", response_model=list[RetiradaDiaRead])
def proximas_retiradas(dias: int = Query(default=7, ge=1, le=31), db: Session = Depends(get_db)):
    """Carga de produção a partir de hoje: pedidos pagos e vagas ocupadas por dia."""
    return relatorio_service.proximas_retiradas(db, dias)


@router.get("/nps",response_model=RelatorioNpsRead)
def relatorio_nps(inicio: date, fim: date, db: Session = Depends(get_db)):
    """Datas no formato AAAA-MM-DD, consideradas no horário de Brasília (ambas inclusivas)."""
    return relatorio_service.nps(db, inicio, fim)