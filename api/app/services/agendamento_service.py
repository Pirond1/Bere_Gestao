from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.agenda import AgendaModel
from app.models.configuracao import ConfiguracaoModel
from app.schemas.agenda import AgendaDiaUpdate, DiaAgendaRead, DiaDisponivelRead
from app.services import configuracao_service

# Maior período que o calendário do painel consulta de uma vez (um mês com folga)
MAX_DIAS_CALENDARIO = 62


@dataclass
class SituacaoDia:
    """Como um dia fica depois de aplicar a configuração da loja ao que foi ajustado nele."""

    capacidade: int
    fechado: bool
    fechado_na_semana: bool
    pedidos_registrados: int

    @property
    def vagas(self) -> int:
        return 0 if self.fechado else max(self.capacidade - self.pedidos_registrados, 0)


def situacao(agenda: Optional[AgendaModel], dia: date, configuracao: ConfiguracaoModel) -> SituacaoDia:
    """Regra única da capacidade do dia — o que o dia não ajustou vem da configuração."""
    fechado_na_semana = dia.weekday() in (configuracao.dias_fechados or [])
    capacidade = configuracao.capacidade_produtiva_padrao
    fechado = fechado_na_semana
    registrados = 0
    if agenda:
        if agenda.capacidade_maxima is not None:
            capacidade = agenda.capacidade_maxima
        # Bloqueio do dia vence o dia da semana (fecha um feriado ou abre uma exceção)
        if agenda.bloqueada is not None:
            fechado = agenda.bloqueada
        registrados = agenda.pedidos_registrados
    return SituacaoDia(capacidade, fechado, fechado_na_semana, registrados)


def buscar_por_data(db: Session, data: date, travar: bool = False) -> Optional[AgendaModel]:
    query = db.query(AgendaModel).filter(AgendaModel.data == data)
    if travar:
        # Trava a linha até o fim da transação para dois pedidos simultâneos
        # não ultrapassarem a capacidade do dia
        query = query.with_for_update()
    return query.first()


def obter_ou_criar(db: Session, data: date, travar: bool = False) -> AgendaModel:
    """Retorna a agenda do dia, criando-a sem ajustes (segue a configuração) se ainda não existir.

    Não faz commit — quem chama controla a transação.
    """
    agenda = buscar_por_data(db, data, travar=travar)
    if agenda:
        return agenda

    agenda = AgendaModel(data=data, capacidade_maxima=None, pedidos_registrados=0, bloqueada=None)
    db.add(agenda)
    db.flush()
    return agenda


def validar_antecedencia(db: Session, data: date) -> None:
    """A retirada precisa respeitar a antecedência mínima definida na configuração."""
    configuracao = configuracao_service.obter(db)
    data_minima = date.today() + timedelta(days=configuracao.antecedencia_minima_dias)
    if data < data_minima:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A retirada só pode ser agendada a partir de {data_minima.strftime('%d/%m/%Y')}",
        )


def verificar_disponibilidade(db: Session, data: date, travar: bool = False) -> AgendaModel:
    """Garante que a data aceita mais um pedido. Levanta 400 quando não aceita."""
    validar_antecedencia(db, data)
    agenda = obter_ou_criar(db, data, travar=travar)
    dia = situacao(agenda, data, configuracao_service.obter(db))

    if dia.fechado:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não haverá atendimento nesta data",
        )
    if dia.vagas == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não há vagas disponíveis para esta data — escolha outro dia",
        )
    return agenda


def reservar(db: Session, data: date) -> AgendaModel:
    """Ocupa uma vaga do dia. Não faz commit — a transação é fechada pelo pedido_service."""
    agenda = verificar_disponibilidade(db, data, travar=True)
    agenda.pedidos_registrados += 1
    db.flush()
    return agenda


def liberar_vaga(db: Session, agenda: AgendaModel) -> None:
    """Devolve a vaga à agenda quando um pedido é cancelado. Não faz commit."""
    if agenda.pedidos_registrados > 0:
        agenda.pedidos_registrados -= 1
        db.flush()


def _agendas_do_periodo(db: Session, inicio: date, fim: date) -> dict[date, AgendaModel]:
    return {
        agenda.data: agenda
        for agenda in db.query(AgendaModel).filter(AgendaModel.data.between(inicio, fim)).all()
    }


def listar_disponibilidade(db: Session, dias: int = 30) -> list[DiaDisponivelRead]:
    """Monta o calendário que o cliente vê ao escolher a data de retirada."""
    configuracao = configuracao_service.obter(db)
    inicio = date.today() + timedelta(days=configuracao.antecedencia_minima_dias)
    fim = inicio + timedelta(days=dias - 1)
    cadastradas = _agendas_do_periodo(db, inicio, fim)

    calendario: list[DiaDisponivelRead] = []
    for deslocamento in range(dias):
        data = inicio + timedelta(days=deslocamento)
        dia = situacao(cadastradas.get(data), data, configuracao)
        calendario.append(
            DiaDisponivelRead(
                data=data,
                capacidade_maxima=dia.capacidade,
                vagas_disponiveis=dia.vagas,
                disponivel=dia.vagas > 0,
            )
        )
    return calendario


def _dia_agenda(agenda: Optional[AgendaModel], data: date, configuracao: ConfiguracaoModel) -> DiaAgendaRead:
    dia = situacao(agenda, data, configuracao)
    return DiaAgendaRead(
        data=data,
        capacidade=dia.capacidade,
        capacidade_personalizada=agenda.capacidade_maxima if agenda else None,
        pedidos_registrados=dia.pedidos_registrados,
        fechado=dia.fechado,
        bloqueio_dia=agenda.bloqueada if agenda else None,
        fechado_na_semana=dia.fechado_na_semana,
        vagas_disponiveis=dia.vagas,
        passado=data < date.today(),
    )


def calendario(db: Session, inicio: date, fim: date) -> list[DiaAgendaRead]:
    """Todos os dias do período para o painel, inclusive os que nunca foram cadastrados (admin)."""
    if fim < inicio:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A data final precisa ser igual ou posterior à inicial",
        )
    if (fim - inicio).days >= MAX_DIAS_CALENDARIO:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Consulte no máximo {MAX_DIAS_CALENDARIO} dias por vez",
        )
    configuracao = configuracao_service.obter(db)
    cadastradas = _agendas_do_periodo(db, inicio, fim)
    return [
        _dia_agenda(cadastradas.get(inicio + timedelta(days=n)), inicio + timedelta(days=n), configuracao)
        for n in range((fim - inicio).days + 1)
    ]


def ajustar_dia(db: Session, data: date, dados: AgendaDiaUpdate) -> DiaAgendaRead:
    """Ajusta capacidade e/ou bloqueio de uma data (admin).

    Bloquear um dia com pedidos é permitido: só impede novos pedidos, os existentes continuam.
    """
    if data < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível alterar um dia que já passou",
        )
    campos = dados.model_dump(exclude_unset=True)
    agenda = obter_ou_criar(db, data)
    if campos.get("capacidade_maxima") is not None and campos["capacidade_maxima"] < agenda.pedidos_registrados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"A data já possui {agenda.pedidos_registrados} pedido(s) — "
                "a capacidade não pode ser menor que isso"
            ),
        )
    for campo, valor in campos.items():
        setattr(agenda, campo, valor)
    db.commit()
    db.refresh(agenda)
    return _dia_agenda(agenda, data, configuracao_service.obter(db))
