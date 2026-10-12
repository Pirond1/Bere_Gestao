"""seed metodos_pagamento e status_pagamento

Revision ID: ffe7348742ca
Revises: caed7147fe5f
Create Date: 2026-10-11 18:35:57.277636

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ffe7348742ca'
down_revision: Union[str, Sequence[str], None] = 'caed7147fe5f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

metodos_pagamento = sa.table(
    "metodos_pagamento",
    sa.column("descricao", sa.String),
)

status_pagamento = sa.table(
    "status_pagamento",
    sa.column("descricao", sa.String),
)

METODOS = ["pix", "cartao_credito"]

STATUS = [
    "pendente",
    "aprovado",
    "recusado",
    "cancelado",
    "expirado",
    "estornado",
]


def upgrade() -> None:
    op.bulk_insert(metodos_pagamento, [{"descricao": d} for d in METODOS])
    op.bulk_insert(status_pagamento, [{"descricao": d} for d in STATUS])


def downgrade() -> None:
    lista_status = ", ".join(f"'{d}'" for d in STATUS)
    op.execute(f"DELETE FROM status_pagamento WHERE descricao IN ({lista_status})")
    lista_metodos = ", ".join(f"'{d}'" for d in METODOS)
    op.execute(f"DELETE FROM metodos_pagamento WHERE descricao IN ({lista_metodos})")