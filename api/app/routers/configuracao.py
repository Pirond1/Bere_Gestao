from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.configuracao import ConfiguracaoPublicaRead, ConfiguracaoRead, ConfiguracaoUpdate
from app.services import configuracao_service

router = APIRouter(prefix="/configuracoes", tags=["Configurações"])


@router.get("/", response_model=ConfiguracaoRead)
def buscar_configuracao(db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return configuracao_service.obter(db)


@router.get("/publica", response_model=ConfiguracaoPublicaRead)
def buscar_configuracao_publica(db: Session = Depends(get_db)):
    """Parâmetros que o cliente vê no checkout (ex.: prazo para pagar)."""
    return configuracao_service.obter(db)


@router.put("/", response_model=ConfiguracaoRead)
def atualizar_configuracao(
    dados: ConfiguracaoUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return configuracao_service.atualizar(db, dados)