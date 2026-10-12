from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel


class VendaPeriodoRead(BaseModel):
    # Dia (agrupamento "dia") ou primeiro dia do mês (agrupamento "mes")
    data: date
    total: Decimal
    pedidos: int


class ProdutoVendidoRead(BaseModel):
    produto_id: int
    nome: str
    quantidade: int
    total: Decimal


class CategoriaVendidaRead(BaseModel):
    # Nulo para produtos sem categoria
    categoria_id: Optional[int]
    nome: str
    quantidade: int
    total: Decimal


class VendaDiaSemanaRead(BaseModel):
    # 0 = segunda … 6 = domingo, pelo dia da retirada
    dia_semana: int
    pedidos: int
    total: Decimal


class VendaMetodoRead(BaseModel):
    metodo: str
    pedidos: int
    total: Decimal


class RetiradaDiaRead(BaseModel):
    data: date
    pedidos_pagos: int
    # Unidades a produzir nos pedidos pagos do dia
    itens: int
    vagas_ocupadas: int
    capacidade_maxima: int
    bloqueada: bool


class RelatorioVendasRead(BaseModel):
    inicio: date
    fim: date
    agrupamento: Literal["dia", "mes"]
    total_pago: Decimal
    quantidade_pedidos: int
    ticket_medio: Decimal
    total_estornado: Decimal
    # Mesmo número de dias imediatamente antes do período — base da comparação no dashboard
    total_pago_periodo_anterior: Decimal
    serie: list[VendaPeriodoRead]
    produtos_mais_vendidos: list[ProdutoVendidoRead]
    vendas_por_categoria: list[CategoriaVendidaRead]
    vendas_por_dia_semana: list[VendaDiaSemanaRead]
    vendas_por_metodo: list[VendaMetodoRead]


class AvaliacaoRelatorioRead(BaseModel):
    id: int
    pedido_id: int
    cliente_nome: str
    # Avaliação do primeiro pedido pago do cliente
    primeira_compra: bool
    nota: int
    comentario: Optional[str]
    data_avaliacao: datetime


class SegmentoClientesRead(BaseModel):
    # Clientes com pedido pago no período
    clientes: int
    avaliacoes: int
    nps: Optional[int]


class DetratorRead(BaseModel):
    id: int
    pedido_id: int
    cliente_nome: str
    telefone: Optional[str]
    nota: int
    comentario: Optional[str]
    data_avaliacao: datetime


class NpsMesRead(BaseModel):
    # Primeiro dia do mês
    mes: date
    avaliacoes: int
    nps: Optional[int]


class NpsCategoriaRead(BaseModel):
    # Nulo para produtos sem categoria
    categoria_id: Optional[int]
    nome: str
    avaliacoes: int
    nps: Optional[int]


class RelatorioNpsRead(BaseModel):
    inicio: date
    fim: date
    total_avaliacoes: int
    # Índice de -100 a 100; nulo quando não há avaliações no período
    nps: Optional[int]
    promotores: int
    neutros: int
    detratores: int
    # Quantidade de avaliações por nota — posição 0 é a nota 0, posição 10 é a nota 10
    distribuicao: list[int]
    # Novos: primeira compra paga no período · Recorrentes: já tinham comprado antes
    novos: SegmentoClientesRead
    recorrentes: SegmentoClientesRead
    # Taxa de resposta: pedidos entregues com retirada no período × quantos foram avaliados
    pedidos_entregues: int
    pedidos_avaliados: int
    detratores_recentes: list[DetratorRead]
    # Últimos meses até o fim do período, independentemente do início
    evolucao: list[NpsMesRead]
    por_categoria: list[NpsCategoriaRead]
    avaliacoes: list[AvaliacaoRelatorioRead]