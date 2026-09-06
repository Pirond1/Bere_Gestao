from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.configuracao import ConfiguracaoModel
from app.schemas.configuracao import ConfiguracaoUpdate


def obter(db: Session) -> ConfiguracaoModel:
    """Retorna a linha única de configuração, criada pela migration de seed."""
    configuracao = db.query(ConfiguracaoModel).order_by(ConfiguracaoModel.id).first()
    if not configuracao:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuração do sistema não encontrada — verifique as migrations",
        )
    return configuracao


def atualizar(db: Session, dados: ConfiguracaoUpdate) -> ConfiguracaoModel:
    configuracao = obter(db)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(configuracao, campo, valor)
    db.commit()
    db.refresh(configuracao)
    return configuracao