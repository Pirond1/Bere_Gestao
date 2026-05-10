"""seed tipos_usuario

Revision ID: 7a9d5db2b36b
Revises: 798b620a5cbc
Create Date: 2026-05-10 01:41:34.401974

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '7a9d5db2b36b'
down_revision: Union[str, Sequence[str], None] = '798b620a5cbc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

tipos_usuario = sa.table(
    "tipos_usuario",
    sa.column("descricao", sa.String),
)


def upgrade() -> None:
    op.bulk_insert(tipos_usuario, [
        {"descricao": "admin"},
        {"descricao": "cliente"},
    ])


def downgrade() -> None:
    op.execute("DELETE FROM tipos_usuario WHERE descricao IN ('admin', 'cliente')")
