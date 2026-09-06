from datetime import date, timedelta
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.agenda import AgendaModel
from app.schemas.agenda import AgendaCreate, AgendaUpdate, DiaDisponivelRead
from app.services import configuracao_service


def buscar_por_data(db: Session, data: date, travar: bool = False) -> Optional[AgendaModel]:
    query = db.query(AgendaModel).filter(AgendaModel.data == data)
    if travar:
        # Trava a linha até o fim da transação para dois pedidos simultâneos
        # não ultrapassarem a capacidade do dia
        query = query.with_for_update()
    return query.first()


def buscar_por_id(db: Session, agenda_id: int) -> AgendaModel:
    agenda = db.query(AgendaModel).filter(AgendaModel.id == agenda_id).first()
    if not agenda:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Data não encontrada na agenda",
        )
    return agenda


def obter_ou_criar(db: Session, data: date, travar: bool = False) -> AgendaModel:
    """Retorna a agenda do dia, criando com a capacidade padrão se ainda não existir.

    Não faz commit — quem chama controla a transação.
    """
    agenda = buscar_por_data(db, data, travar=travar)
    if agenda:
        return agenda

    configuracao = configuracao_service.obter(db)
    agenda = AgendaModel(
        data=data,
        capacidade_maxima=configuracao.capacidade_produtiva_padrao,
        pedidos_registrados=0,
        bloqueada=False,
    )
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

    if agenda.bloqueada:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não haverá atendimento nesta data",
        )
    if agenda.pedidos_registrados >= agenda.capacidade_maxima:
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


def listar_disponibilidade(db: Session, dias: int = 30) -> list[DiaDisponivelRead]:
    """Monta o calendário que o cliente vê ao escolher a data de retirada.

    Dias ainda não cadastrados aparecem com a capacidade padrão da configuração.
    """
    configuracao = configuracao_service.obter(db)
    inicio = date.today() + timedelta(days=configuracao.antecedencia_minima_dias)
    fim = inicio + timedelta(days=dias - 1)

    cadastradas = {
        agenda.data: agenda
        for agenda in db.query(AgendaModel).filter(AgendaModel.data.between(inicio, fim)).all()
    }

    calendario: list[DiaDisponivelRead] = []
    for deslocamento in range(dias):
        dia = inicio + timedelta(days=deslocamento)
        agenda = cadastradas.get(dia)
        capacidade = agenda.capacidade_maxima if agenda else configuracao.capacidade_produtiva_padrao
        registrados = agenda.pedidos_registrados if agenda else 0
        bloqueada = agenda.bloqueada if agenda else False
        vagas = 0 if bloqueada else max(capacidade - registrados, 0)
        calendario.append(
            DiaDisponivelRead(
                data=dia,
                capacidade_maxima=capacidade,
                vagas_disponiveis=vagas,
                disponivel=vagas > 0,
            )
        )
    return calendario


def listar(
    db: Session,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
) -> list[AgendaModel]:
    query = db.query(AgendaModel)
    if data_inicio:
        query = query.filter(AgendaModel.data >= data_inicio)
    if data_fim:
        query = query.filter(AgendaModel.data <= data_fim)
    return query.order_by(AgendaModel.data).all()


def _validar_capacidade(agenda: AgendaModel, capacidade: int) -> None:
    if capacidade < agenda.pedidos_registrados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"A data já possui {agenda.pedidos_registrados} pedido(s) — "
                "a capacidade não pode ser menor que isso"
            ),
        )


def definir(db: Session, dados: AgendaCreate) -> AgendaModel:
    """Cadastra ou sobrescreve a capacidade de uma data específica (admin)."""
    agenda = buscar_por_data(db, dados.data)
    if agenda:
        _validar_capacidade(agenda, dados.capacidade_maxima)
        agenda.capacidade_maxima = dados.capacidade_maxima
        agenda.bloqueada = dados.bloqueada
    else:
        agenda = AgendaModel(**dados.model_dump(), pedidos_registrados=0)
        db.add(agenda)
    db.commit()
    db.refresh(agenda)
    return agenda


def atualizar(db: Session, agenda_id: int, dados: AgendaUpdate) -> AgendaModel:
    agenda = buscar_por_id(db, agenda_id)
    campos = dados.model_dump(exclude_unset=True)
    if "capacidade_maxima" in campos:
        _validar_capacidade(agenda, campos["capacidade_maxima"])
    for campo, valor in campos.items():
        setattr(agenda, campo, valor)
    db.commit()
    db.refresh(agenda)
    return agenda