from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field, computed_field


class AgendaCreate(BaseModel):
    data: date
    capacidade_maxima: int = Field(ge=0)
    bloqueada: bool = False


class AgendaUpdate(BaseModel):
    capacidade_maxima: Optional[int] = Field(default=None, ge=0)
    bloqueada: Optional[bool] = None


class AgendaRead(BaseModel):
    id: int
    data: date
    capacidade_maxima: int
    pedidos_registrados: int
    bloqueada: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @computed_field
    @property
    def vagas_disponiveis(self) -> int:
        if self.bloqueada:
            return 0
        return max(self.capacidade_maxima - self.pedidos_registrados, 0)


class DiaDisponivelRead(BaseModel):
    """Uma data do calendário exibido ao cliente na hora de agendar a retirada."""

    data: date
    capacidade_maxima: int
    vagas_disponiveis: int
    disponivel: bool