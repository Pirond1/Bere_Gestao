"""adiciona aviso de pedido pronto

Revision ID: a3c5e7f9b210
Revises: 336b1bf55c95
Create Date: 2026-10-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a3c5e7f9b210'
down_revision: Union[str, Sequence[str], None] = '336b1bf55c95'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('pedidos', sa.Column('avisado_em', sa.DateTime(), nullable=True))
    op.add_column('configuracoes', sa.Column('endereco_retirada', sa.String(length=255), nullable=True))
    op.add_column('configuracoes', sa.Column('horario_retirada', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('configuracoes', 'horario_retirada')
    op.drop_column('configuracoes', 'endereco_retirada')
    op.drop_column('pedidos', 'avisado_em')