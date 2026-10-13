from datetime import date
from typing import Optional

from pydantic import BaseModel, Field


class AgendaDiaUpdate(BaseModel):
    """Ajuste de um dia pela proprietária. Campo ausente não muda; nulo volta a seguir a configuração."""

    # Nulo = capacidade padrão
    capacidade_maxima: Optional[int] = Field(default=None, ge=0, le=500)
    # Nulo = segue os dias da semana fechados; true = fechado; false = aberto como exceção
    bloqueada: Optional[bool] = None


class DiaAgendaRead(BaseModel):
    """Um dia no calendário do painel, já com a configuração aplicada."""

    data: date
    # Capacidade que vale para o dia (a personalizada ou a padrão)
    capacidade: int
    capacidade_personalizada: Optional[int]
    pedidos_registrados: int
    # Situação final do dia e de onde ela vem
    fechado: bool
    bloqueio_dia: Optional[bool]
    fechado_na_semana: bool
    vagas_disponiveis: int
    # Antes de hoje — só consulta, não pode ser ajustado
    passado: bool


class DiaDisponivelRead(BaseModel):
    """Uma data do calendário exibido ao cliente na hora de agendar a retirada."""

    data: date
    capacidade_maxima: int
    vagas_disponiveis: int
    disponivel: bool
