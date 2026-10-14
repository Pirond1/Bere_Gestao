"""Situação do backup periódico (BG-23), mostrada no painel da proprietária.

Quem faz o backup é o container `backup` (backup/backup.sh). Ele grava na pasta compartilhada:
- ultimo_backup.json: o último backup concluído (data, arquivo, tamanho, cópia externa)
- ultima_falha.json: a última tentativa com erro — apagado quando um backup seguinte dá certo
A API só lê esses arquivos; não dispara backup.
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.core.config import settings
from app.schemas.backup import BackupRead

# Backup é diário: passou disso sem um novo, algo parou (container fora do ar, servidor desligado)
LIMITE_ATRASO = timedelta(hours=26)


def _ler(arquivo: Path) -> dict | None:
    try:
        return json.loads(arquivo.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def situacao() -> BackupRead:
    ok = _ler(settings.BACKUPS_DIR / "ultimo_backup.json")
    falha = _ler(settings.BACKUPS_DIR / "ultima_falha.json")

    resposta = BackupRead(situacao="nunca")
    if ok:
        resposta.ultimo_backup = datetime.fromisoformat(ok["data_hora"])
        resposta.tamanho_bytes = ok.get("tamanho_bytes")
        resposta.copia_externa = ok.get("copia_externa")
        atrasado = datetime.now(timezone.utc) - resposta.ultimo_backup > LIMITE_ATRASO
        resposta.situacao = "atrasado" if atrasado else "ok"
    if falha:
        resposta.ultima_falha = datetime.fromisoformat(falha["data_hora"])
        resposta.erro = falha.get("erro")
        resposta.situacao = "falhou"
    return resposta