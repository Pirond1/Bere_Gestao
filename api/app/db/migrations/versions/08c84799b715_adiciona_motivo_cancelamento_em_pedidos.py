"""adiciona motivo_cancelamento em pedidos

Revision ID: 08c84799b715
Revises: ffe7348742ca
Create Date: 2026-10-11 23:51:37.620638

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '08c84799b715'
down_revision: Union[str, Sequence[str], None] = 'ffe7348742ca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # O autogenerate também sugeria trocar pagamentos.qr_code_base64 (LONGTEXT ↔ Text):
    # falso positivo do MySQL, removido para não mexer na coluna
    op.add_column('pedidos', sa.Column('motivo_cancelamento', sa.String(length=255), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('pedidos', 'motivo_cancelamento')
