"""agenda segue configuracao e prazo do pix

Revision ID: b4d6f8a0c321
Revises: a3c5e7f9b210
Create Date: 2026-10-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'b4d6f8a0c321'
down_revision: Union[str, Sequence[str], None] = 'a3c5e7f9b210'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Prazo do PIX sai do .env (PRAZO_PAGAMENTO_MINUTOS, padrão 30) e vai para o painel
    op.add_column(
        'configuracoes',
        sa.Column('prazo_pagamento_minutos', sa.Integer(), nullable=False, server_default='30'),
    )
    # JSON não aceita DEFAULT literal no MySQL: cria nulo, preenche e só então trava
    op.add_column('configuracoes', sa.Column('dias_fechados', sa.JSON(), nullable=True))
    op.execute("UPDATE configuracoes SET dias_fechados = JSON_ARRAY()")
    op.alter_column('configuracoes', 'dias_fechados', existing_type=sa.JSON(), nullable=False)

    # Nulo passa a significar "segue a configuração"
    op.alter_column('agendas', 'capacidade_maxima', existing_type=mysql.INTEGER(), nullable=True)
    op.alter_column('agendas', 'bloqueada', existing_type=mysql.TINYINT(display_width=1), nullable=True)
    # Até aqui todo dia era criado com a capacidade padrão da época: os que ainda batem com o
    # padrão atual são tratados como não ajustados. Sem dias fechados na semana, false = sem decisão
    op.execute(
        "UPDATE agendas SET capacidade_maxima = NULL "
        "WHERE capacidade_maxima = (SELECT capacidade_produtiva_padrao FROM configuracoes ORDER BY id LIMIT 1)"
    )
    op.execute("UPDATE agendas SET bloqueada = NULL WHERE bloqueada = 0")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute(
        "UPDATE agendas SET capacidade_maxima = "
        "(SELECT capacidade_produtiva_padrao FROM configuracoes ORDER BY id LIMIT 1) "
        "WHERE capacidade_maxima IS NULL"
    )
    op.execute("UPDATE agendas SET bloqueada = 0 WHERE bloqueada IS NULL")
    op.alter_column('agendas', 'bloqueada', existing_type=mysql.TINYINT(display_width=1), nullable=False)
    op.alter_column('agendas', 'capacidade_maxima', existing_type=mysql.INTEGER(), nullable=False)
    op.drop_column('configuracoes', 'dias_fechados')
    op.drop_column('configuracoes', 'prazo_pagamento_minutos')