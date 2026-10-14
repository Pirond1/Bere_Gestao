from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


class BackupRead(BaseModel):
    # ok: backup recente | atrasado: nenhum nas últimas horas esperadas | falhou: última tentativa deu erro
    # nunca: nenhum backup feito neste servidor
    situacao: Literal["ok", "atrasado", "falhou", "nunca"]
    ultimo_backup: Optional[datetime] = None
    tamanho_bytes: Optional[int] = None
    # Cópia fora do servidor (Drive): "desativada" quando o BACKUP_REMOTO não está configurado
    copia_externa: Optional[Literal["enviada", "falhou", "desativada"]] = None
    ultima_falha: Optional[datetime] = None
    erro: Optional[str] = None