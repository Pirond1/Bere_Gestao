"""seed status_pedido e configuracao inicial

Revision ID: 2f438b8f75d7
Revises: 68dd3879e3a6
Create Date: 2026-09-06 20:04:12.118293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '2f438b8f75d7'
down_revision: Union[str, Sequence[str], None] = '68dd3879e3a6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

status_pedido = sa.table(
    "status_pedido",
    sa.column("descricao", sa.String),
)

configuracoes = sa.table(
    "configuracoes",
    sa.column("capacidade_produtiva_padrao", sa.Integer),
    sa.column("antecedencia_minima_dias", sa.Integer),
)

DESCRICOES = [
    "aguardando_pagamento",
    "confirmado",
    "em_producao",
    "pronto",
    "entregue",
    "cancelado",
]


def upgrade() -> None:
    op.bulk_insert(status_pedido, [{"descricao": d} for d in DESCRICOES])
    # Linha única de configuração — a proprietária ajusta os valores pelo painel
    op.bulk_insert(configuracoes, [
        {"capacidade_produtiva_padrao": 10, "antecedencia_minima_dias": 1},
    ])


def downgrade() -> None:
    op.execute("DELETE FROM configuracoes")
    lista = ", ".join(f"'{d}'" for d in DESCRICOES)
    op.execute(f"DELETE FROM status_pedido WHERE descricao IN ({lista})")