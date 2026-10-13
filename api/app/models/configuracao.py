from sqlalchemy import JSON, Column, Integer, String

from app.db.base import BaseModel


class ConfiguracaoModel(BaseModel):
    __tablename__ = "configuracoes"

    # Tabela de linha única — parâmetros de negócio editáveis pela proprietária
    # Capacidade assumida nos dias que não tiveram a capacidade ajustada na agenda
    capacidade_produtiva_padrao = Column(Integer, nullable=False, default=10)
    # Antecedência mínima entre a data do pedido e a data de retirada, em dias
    antecedencia_minima_dias = Column(Integer, nullable=False, default=1)
    # Tempo para o cliente pagar o PIX; depois disso o pedido é cancelado e a vaga volta
    prazo_pagamento_minutos = Column(Integer, nullable=False, default=30)
    # Dias da semana sem atendimento (0 = segunda … 6 = domingo, como date.weekday())
    dias_fechados = Column(JSON, nullable=False, default=list)
    # Onde e quando retirar — vão no aviso de pedido pronto; nulos = ficam fora da mensagem
    endereco_retirada = Column(String(255), nullable=True)
    horario_retirada = Column(String(100), nullable=True)