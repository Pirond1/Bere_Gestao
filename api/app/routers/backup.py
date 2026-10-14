from fastapi import APIRouter, Depends

from app.core.deps import get_admin_atual
from app.schemas.backup import BackupRead
from app.services import backup_service

router = APIRouter(prefix="/backup", tags=["Backup"], dependencies=[Depends(get_admin_atual)])


@router.get("", response_model=BackupRead)
def situacao_backup():
    """Quando foi o último backup do banco e das fotos (feito pelo container `backup`)."""
    return backup_service.situacao()