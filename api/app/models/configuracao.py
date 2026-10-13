from sqlalchemy import Column, Integer, String

from app.db.base import BaseModel


class ConfiguracaoModel(BaseModel):
    __tablename__ = "configuracoes"

    # Tabela de linha única — parâmetros de negócio editáveis pela proprietária
    # Capacidade assumida nos dias que ainda não foram cadastrados na agenda
    capacidade_produtiva_padrao = Column(Integer, nullable=False, default=10)
    # Antecedência mínima entre a data do pedido e a data de retirada, em dias
    antecedencia_minima_dias = Column(Integer, nullable=False, default=1)
    # Onde e quando retirar — vão no aviso de pedido pronto; nulos = ficam fora da mensagem
    endereco_retirada = Column(String(255), nullable=True)
    horario_retirada = Column(String(100), nullable=True)