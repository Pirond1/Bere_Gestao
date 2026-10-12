"""adiciona visualizado_em em pedidos

Revision ID: 336b1bf55c95
Revises: 08c84799b715
Create Date: 2026-10-12 00:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '336b1bf55c95'
down_revision: Union[str, Sequence[str], None] = '08c84799b715'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O autogenerate também sugeria trocar pagamentos.qr_code_base64 (LONGTEXT ↔ Text):
    # falso positivo do MySQL, removido para não mexer na coluna
    op.add_column('pedidos', sa.Column('visualizado_em', sa.DateTime(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pedidos', 'visualizado_em')
