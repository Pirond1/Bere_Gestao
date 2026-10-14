"""BG-23: o painel mostra quando foi o último backup — a API só lê o que o container de backup grava."""

import json
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings


@pytest.fixture
def pasta(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "BACKUPS_DIR", tmp_path)
    return tmp_path


def gravar_backup(pasta, horas_atras=1, copia="enviada"):
    data_hora = datetime.now(timezone.utc) - timedelta(hours=horas_atras)
    (pasta / "ultimo_backup.json").write_text(json.dumps({
        "data_hora": data_hora.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "arquivo": "diarios/bere_2026-10-14_0300.tar.gz",
        "tamanho_bytes": 280109,
        "copia_externa": copia,
    }))


def test_sem_backup_nenhum(client, admin, pasta):
    assert client.get("/backup", headers=admin).json()["situacao"] == "nunca"


def test_backup_recente(client, admin, pasta):
    gravar_backup(pasta)

    resposta = client.get("/backup", headers=admin).json()

    assert resposta["situacao"] == "ok"
    assert resposta["tamanho_bytes"] == 280109
    assert resposta["copia_externa"] == "enviada"


def test_backup_atrasado_depois_de_um_dia_sem_novo(client, admin, pasta):
    gravar_backup(pasta, horas_atras=30)
    assert client.get("/backup", headers=admin).json()["situacao"] == "atrasado"


def test_falha_aparece_mesmo_com_backup_anterior(client, admin, pasta):
    gravar_backup(pasta, horas_atras=24)
    (pasta / "ultima_falha.json").write_text(json.dumps({
        "data_hora": "2026-10-14T06:00:00Z", "erro": "Não foi possível exportar o banco de dados",
    }))

    resposta = client.get("/backup", headers=admin).json()

    assert resposta["situacao"] == "falhou"
    assert resposta["erro"] == "Não foi possível exportar o banco de dados"
    # O último backup bom continua visível
    assert resposta["ultimo_backup"] is not None


def test_situacao_do_backup_e_so_do_admin(client, cliente, pasta):
    assert client.get("/backup", headers=cliente).status_code == 403