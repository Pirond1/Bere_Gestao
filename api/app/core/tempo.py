"""Datas no fuso da loja.

O container roda em UTC: das 21h à meia-noite de Brasília, `date.today()` já devolve o dia
seguinte. Tudo que depende do "hoje" da loja (agenda, antecedência, datas de cadastro) usa daqui.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

FUSO_LOJA = ZoneInfo("America/Sao_Paulo")


def hoje() -> date:
    """O dia de hoje em Presidente Prudente (horário de Brasília)."""
    return datetime.now(FUSO_LOJA).date()
