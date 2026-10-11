from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from zoneinfo import ZoneInfo

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.agenda import AgendaModel
from app.models.avaliacao import AvaliacaoModel
from app.models.item_pedido import ItemPedidoModel
from app.models.pagamento import PagamentoModel
from app.models.pedido import PedidoModel
from app.models.produto import ProdutoModel
from app.models.status_pagamento import StatusPagamentoModel
from app.models.status_pedido import StatusPedidoModel
from app.services import configuracao_service, status_pagamento_service, status_pedido_service

# O banco grava em UTC, mas a dona enxerga o dia no horário de Brasília
FUSO_LOJA = ZoneInfo("America/Sao_Paulo")

# Acima disso o gráfico de faturamento passa a agrupar por mês
MAX_DIAS_AGRUPADO_POR_DIA = 62
LIMITE_PRODUTOS = 10
LIMITE_AVALIACOES = 200
SEM_CATEGORIA = "Sem categoria"
DIAS_PROXIMAS_RETIRADAS = 7
LIMITE_DETRATORES = 5
MESES_EVOLUCAO = 6

STATUS_A_PRODUZIR = (
    status_pedido_service.CONFIRMADO,
    status_pedido_service.EM_PRODUCAO,
    status_pedido_service.PRONTO,
)

# Faixas do Net Promoter Score
NOTA_MINIMA_PROMOTOR = 9
NOTA_MINIMA_NEUTRO = 7


def _validar_periodo(inicio: date, fim: date) -> None:
    if inicio > fim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A data inicial não pode ser depois da data final",
        )


def _intervalo_utc(inicio: date, fim: date) -> tuple[datetime, datetime]:
    """Converte dias do calendário local em [início, fim) no UTC sem fuso usado pelo banco."""

    def _para_utc(dia: date) -> datetime:
        local = datetime.combine(dia, time.min, tzinfo=FUSO_LOJA)
        return local.astimezone(timezone.utc).replace(tzinfo=None)

    return _para_utc(inicio), _para_utc(fim + timedelta(days=1))


def _data_local(momento: datetime) -> date:
    return momento.replace(tzinfo=timezone.utc).astimezone(FUSO_LOJA).date()


def _foi_pago():
    """Pedido com pagamento aprovado — estornados e cancelados não contam como venda."""
    return PedidoModel.pagamentos.any(
        PagamentoModel.status.has(StatusPagamentoModel.descricao == status_pagamento_service.APROVADO)
    )


def _pagamento_aprovado(pedido: PedidoModel) -> PagamentoModel:
    return next(
        p for p in pedido.pagamentos if p.status.descricao == status_pagamento_service.APROVADO
    )


def _total_pago(db: Session, inicio: date, fim: date) -> Decimal:
    de, ate = _intervalo_utc(inicio, fim)
    total = (
        db.query(func.sum(PedidoModel.valor_total))
        .filter(_foi_pago(), PedidoModel.data_pedido >= de, PedidoModel.data_pedido < ate)
        .scalar()
    )
    return total or Decimal("0")


def _total_estornado(db: Session, inicio: date, fim: date) -> Decimal:
    de, ate = _intervalo_utc(inicio, fim)
    total = (
        db.query(func.sum(PagamentoModel.valor))
        .join(PedidoModel, PagamentoModel.pedido_id == PedidoModel.id)
        .filter(
            PagamentoModel.status.has(
                StatusPagamentoModel.descricao == status_pagamento_service.ESTORNADO
            ),
            PedidoModel.data_pedido >= de,
            PedidoModel.data_pedido < ate,
        )
        .scalar()
    )
    return total or Decimal("0")


def _chaves_serie(inicio: date, fim: date, por_mes: bool) -> list[date]:
    """Todos os dias (ou meses) do período, para o gráfico mostrar também os zerados."""
    chaves = []
    atual = inicio.replace(day=1) if por_mes else inicio
    while atual <= fim:
        chaves.append(atual)
        if por_mes:
            atual = (atual.replace(day=28) + timedelta(days=4)).replace(day=1)
        else:
            atual += timedelta(days=1)
    return chaves


def vendas(db: Session, inicio: date, fim: date) -> dict:
    """Dashboard de vendas (RF_S01): total pago no período, evolução e produtos mais vendidos."""
    _validar_periodo(inicio, fim)
    de, ate = _intervalo_utc(inicio, fim)

    pedidos = (
        db.query(PedidoModel)
        .filter(_foi_pago(), PedidoModel.data_pedido >= de, PedidoModel.data_pedido < ate)
        .options(
            selectinload(PedidoModel.itens)
            .joinedload(ItemPedidoModel.produto)
            .joinedload(ProdutoModel.categoria),
            joinedload(PedidoModel.agenda),
            selectinload(PedidoModel.pagamentos).joinedload(PagamentoModel.metodo),
            selectinload(PedidoModel.pagamentos).joinedload(PagamentoModel.status),
        )
        .all()
    )

    por_mes = (fim - inicio).days + 1 > MAX_DIAS_AGRUPADO_POR_DIA
    serie = {chave: {"total": Decimal("0"), "pedidos": 0} for chave in _chaves_serie(inicio, fim, por_mes)}
    produtos: dict[int, dict] = defaultdict(
        lambda: {"nome": "", "quantidade": 0, "total": Decimal("0")}
    )
    # Chave None agrupa os produtos cadastrados sem categoria
    categorias: dict[int | None, dict] = defaultdict(
        lambda: {"nome": SEM_CATEGORIA, "quantidade": 0, "total": Decimal("0")}
    )
    # weekday() do Python: 0 = segunda … 6 = domingo
    dias_semana = [{"dia_semana": dia, "pedidos": 0, "total": Decimal("0")} for dia in range(7)]
    metodos: dict[str, dict] = defaultdict(lambda: {"pedidos": 0, "total": Decimal("0")})

    for pedido in pedidos:
        dia = _data_local(pedido.data_pedido)
        chave = dia.replace(day=1) if por_mes else dia
        serie[chave]["total"] += pedido.valor_total
        serie[chave]["pedidos"] += 1

        # Pelo dia da retirada — é o que pesa na capacidade de produção
        dia_semana = dias_semana[pedido.agenda.data.weekday()]
        dia_semana["pedidos"] += 1
        dia_semana["total"] += pedido.valor_total

        pagamento = _pagamento_aprovado(pedido)
        metodo = metodos[pagamento.metodo.descricao]
        metodo["pedidos"] += 1
        metodo["total"] += pagamento.valor

        for item in pedido.itens:
            produto = produtos[item.produto_id]
            produto["nome"] = item.produto.nome
            produto["quantidade"] += item.quantidade
            produto["total"] += item.subtotal

            categoria = categorias[item.produto.categoria_id]
            if item.produto.categoria:
                categoria["nome"] = item.produto.categoria.nome
            categoria["quantidade"] += item.quantidade
            categoria["total"] += item.subtotal

    total_pago = sum((p.valor_total for p in pedidos), Decimal("0"))
    quantidade = len(pedidos)

    duracao = fim - inicio
    fim_anterior = inicio - timedelta(days=1)
    inicio_anterior = fim_anterior - duracao

    mais_vendidos = sorted(
        ({"produto_id": produto_id, **dados} for produto_id, dados in produtos.items()),
        key=lambda p: (p["quantidade"], p["total"]),
        reverse=True,
    )

    return {
        "inicio": inicio,
        "fim": fim,
        "agrupamento": "mes" if por_mes else "dia",
        "total_pago": total_pago,
        "quantidade_pedidos": quantidade,
        "ticket_medio": (total_pago / quantidade).quantize(Decimal("0.01")) if quantidade else Decimal("0"),
        "total_estornado": _total_estornado(db, inicio, fim),
        "total_pago_periodo_anterior": _total_pago(db, inicio_anterior, fim_anterior),
        "serie": [{"data": chave, **valores} for chave, valores in serie.items()],
        "produtos_mais_vendidos": mais_vendidos[:LIMITE_PRODUTOS],
        "vendas_por_categoria": sorted(
            ({"categoria_id": categoria_id, **dados} for categoria_id, dados in categorias.items()),
            key=lambda c: c["total"],
            reverse=True,
        ),
        "vendas_por_dia_semana": dias_semana,
        "vendas_por_metodo": sorted(
            ({"metodo": metodo, **dados} for metodo, dados in metodos.items()),
            key=lambda m: m["total"],
            reverse=True,
        ),
    }


def proximas_retiradas(db: Session, dias: int = DIAS_PROXIMAS_RETIRADAS) -> list[dict]:
    """Carga de produção dos próximos dias: pedidos pagos e ocupação da capacidade."""
    hoje = datetime.now(FUSO_LOJA).date()
    fim = hoje + timedelta(days=dias - 1)

    configuracao = configuracao_service.obter(db)
    agendas = {
        agenda.data: agenda
        for agenda in db.query(AgendaModel).filter(AgendaModel.data.between(hoje, fim)).all()
    }

    # Pagos e ainda não entregues/cancelados — o que falta produzir ou entregar
    pedidos = (
        db.query(PedidoModel)
        .join(AgendaModel, PedidoModel.agenda_id == AgendaModel.id)
        .filter(
            _foi_pago(),
            AgendaModel.data.between(hoje, fim),
            PedidoModel.status.has(StatusPedidoModel.descricao.in_(STATUS_A_PRODUZIR)),
        )
        .options(joinedload(PedidoModel.agenda), selectinload(PedidoModel.itens))
        .all()
    )
    pagos: dict[date, dict] = defaultdict(lambda: {"pedidos": 0, "itens": 0})
    for pedido in pedidos:
        dia = pagos[pedido.agenda.data]
        dia["pedidos"] += 1
        dia["itens"] += sum(item.quantidade for item in pedido.itens)

    resultado = []
    for deslocamento in range(dias):
        data = hoje + timedelta(days=deslocamento)
        agenda = agendas.get(data)
        resultado.append(
            {
                "data": data,
                "pedidos_pagos": pagos[data]["pedidos"],
                "itens": pagos[data]["itens"],
                # Inclui pedidos aguardando pagamento, que já seguram a vaga
                "vagas_ocupadas": agenda.pedidos_registrados if agenda else 0,
                "capacidade_maxima": (
                    agenda.capacidade_maxima if agenda else configuracao.capacidade_produtiva_padrao
                ),
                "bloqueada": agenda.bloqueada if agenda else False,
            }
        )
    return resultado


def nps(db: Session, inicio: date, fim: date) -> dict:
    """Relatório NPS (RF_S02): índice de satisfação das avaliações feitas no período."""
    _validar_periodo(inicio, fim)
    de, ate = _intervalo_utc(inicio, fim)

    avaliacoes = (
        db.query(AvaliacaoModel)
        .filter(AvaliacaoModel.data_avaliacao >= de, AvaliacaoModel.data_avaliacao < ate)
        .options(
            joinedload(AvaliacaoModel.pedido).joinedload(PedidoModel.cliente),
            joinedload(AvaliacaoModel.pedido)
            .selectinload(PedidoModel.itens)
            .joinedload(ItemPedidoModel.produto)
            .joinedload(ProdutoModel.categoria),
        )
        .order_by(AvaliacaoModel.data_avaliacao.desc())
        .all()
    )

    distribuicao = [0] * 11
    for avaliacao in avaliacoes:
        distribuicao[avaliacao.nota] += 1

    total = len(avaliacoes)
    promotores = sum(distribuicao[NOTA_MINIMA_PROMOTOR:])
    neutros = sum(distribuicao[NOTA_MINIMA_NEUTRO:NOTA_MINIMA_PROMOTOR])
    detratores = sum(distribuicao[:NOTA_MINIMA_NEUTRO])

    primeiras = _primeiras_compras(db)
    primeira_compra = {a.id: _e_primeira_compra(a.pedido, primeiras) for a in avaliacoes}
    notas_novos = [a.nota for a in avaliacoes if primeira_compra[a.id]]
    notas_recorrentes = [a.nota for a in avaliacoes if not primeira_compra[a.id]]
    clientes_novos, clientes_recorrentes = _clientes_por_tipo(db, de, ate, primeiras)
    entregues, avaliados = _taxa_resposta(db, inicio, fim)

    return {
        "inicio": inicio,
        "fim": fim,
        "total_avaliacoes": total,
        "nps": _indice_nps(promotores, detratores, total),
        "promotores": promotores,
        "neutros": neutros,
        "detratores": detratores,
        "distribuicao": distribuicao,
        "novos": _segmento(clientes_novos, notas_novos),
        "recorrentes": _segmento(clientes_recorrentes, notas_recorrentes),
        "pedidos_entregues": entregues,
        "pedidos_avaliados": avaliados,
        # Telefone só dos detratores: é o que a dona precisa para retornar o contato (LGPD — mínimo necessário)
        "detratores_recentes": [
            {
                "id": a.id,
                "pedido_id": a.pedido_id,
                "cliente_nome": a.pedido.cliente.nome,
                "telefone": a.pedido.cliente.telefone,
                "nota": a.nota,
                "comentario": a.comentario,
                "data_avaliacao": a.data_avaliacao,
            }
            for a in avaliacoes
            if a.nota < NOTA_MINIMA_NEUTRO
        ][:LIMITE_DETRATORES],
        "evolucao": _evolucao_mensal(db, fim),
        "por_categoria": _nps_por_categoria(avaliacoes),
        "avaliacoes": [
            {
                "id": a.id,
                "pedido_id": a.pedido_id,
                "cliente_nome": a.pedido.cliente.nome,
                "primeira_compra": primeira_compra[a.id],
                "nota": a.nota,
                "comentario": a.comentario,
                "data_avaliacao": a.data_avaliacao,
            }
            for a in avaliacoes[:LIMITE_AVALIACOES]
        ],
    }


def _indice_nps(promotores: int, detratores: int, total: int) -> int | None:
    # NPS = % promotores − % detratores
    return round((promotores - detratores) * 100 / total) if total else None


def _nps_das_notas(notas: list[int]) -> int | None:
    promotores = sum(1 for n in notas if n >= NOTA_MINIMA_PROMOTOR)
    detratores = sum(1 for n in notas if n < NOTA_MINIMA_NEUTRO)
    return _indice_nps(promotores, detratores, len(notas))


def _segmento(clientes: int, notas: list[int]) -> dict:
    return {"clientes": clientes, "avaliacoes": len(notas), "nps": _nps_das_notas(notas)}


def _taxa_resposta(db: Session, inicio: date, fim: date) -> tuple[int, int]:
    """Pedidos entregues com retirada no período e quantos deles foram avaliados."""
    pedidos = (
        db.query(PedidoModel)
        .join(AgendaModel, PedidoModel.agenda_id == AgendaModel.id)
        .filter(
            AgendaModel.data.between(inicio, fim),
            PedidoModel.status.has(StatusPedidoModel.descricao == status_pedido_service.ENTREGUE),
        )
        .options(joinedload(PedidoModel.avaliacao))
        .all()
    )
    return len(pedidos), sum(1 for p in pedidos if p.avaliacao)


def _evolucao_mensal(db: Session, fim: date) -> list[dict]:
    """NPS mês a mês nos últimos meses até o fim do período — mostra a tendência."""
    # Meses futuros só apareceriam vazios
    fim = min(fim, datetime.now(FUSO_LOJA).date())
    ultimo_mes = fim.replace(day=1)
    primeiro_mes = ultimo_mes
    for _ in range(MESES_EVOLUCAO - 1):
        primeiro_mes = (primeiro_mes - timedelta(days=1)).replace(day=1)

    de, ate = _intervalo_utc(primeiro_mes, fim)
    linhas = (
        db.query(AvaliacaoModel.data_avaliacao, AvaliacaoModel.nota)
        .filter(AvaliacaoModel.data_avaliacao >= de, AvaliacaoModel.data_avaliacao < ate)
        .all()
    )
    notas_por_mes: dict[date, list[int]] = {
        mes: [] for mes in _chaves_serie(primeiro_mes, fim, por_mes=True)
    }
    for data_avaliacao, nota in linhas:
        notas_por_mes[_data_local(data_avaliacao).replace(day=1)].append(nota)

    return [
        {"mes": mes, "avaliacoes": len(notas), "nps": _nps_das_notas(notas)}
        for mes, notas in notas_por_mes.items()
    ]


def _nps_por_categoria(avaliacoes: list[AvaliacaoModel]) -> list[dict]:
    """Cada avaliação conta para todas as categorias presentes no pedido avaliado."""
    notas: dict[int | None, dict] = defaultdict(lambda: {"nome": SEM_CATEGORIA, "notas": []})
    for avaliacao in avaliacoes:
        categorias = {item.produto.categoria for item in avaliacao.pedido.itens}
        for categoria in categorias:
            grupo = notas[categoria.id if categoria else None]
            if categoria:
                grupo["nome"] = categoria.nome
            grupo["notas"].append(avaliacao.nota)

    resultado = [
        {
            "categoria_id": categoria_id,
            "nome": grupo["nome"],
            "avaliacoes": len(grupo["notas"]),
            "nps": _nps_das_notas(grupo["notas"]),
        }
        for categoria_id, grupo in notas.items()
    ]
    return sorted(resultado, key=lambda c: c["avaliacoes"], reverse=True)


def _primeiras_compras(db: Session) -> dict[int, datetime]:
    """Data do primeiro pedido pago de cada cliente — define quem é novo e quem é recorrente."""
    linhas = (
        db.query(PedidoModel.cliente_id, func.min(PedidoModel.data_pedido))
        .filter(_foi_pago())
        .group_by(PedidoModel.cliente_id)
        .all()
    )
    return dict(linhas)


def _e_primeira_compra(pedido: PedidoModel, primeiras: dict[int, datetime]) -> bool:
    # Sem pedido pago registrado (ex.: pedidos anteriores à integração de pagamento) conta como novo
    primeira = primeiras.get(pedido.cliente_id)
    return primeira is None or pedido.data_pedido <= primeira


def _clientes_por_tipo(
    db: Session, de: datetime, ate: datetime, primeiras: dict[int, datetime]
) -> tuple[int, int]:
    """Clientes que compraram no período: novos (1ª compra paga no período) × recorrentes."""
    clientes = {
        cliente_id
        for (cliente_id,) in db.query(PedidoModel.cliente_id)
        .filter(_foi_pago(), PedidoModel.data_pedido >= de, PedidoModel.data_pedido < ate)
        .distinct()
    }
    novos = sum(1 for cliente_id in clientes if primeiras[cliente_id] >= de)
    return novos, len(clientes) - novos