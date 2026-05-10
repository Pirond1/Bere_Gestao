"""cria tabelas tipos_usuario e usuarios

Revision ID: b7015f7959cf
Revises: 
Create Date: 2026-05-09 23:46:24.243838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7015f7959cf'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('tipos_usuario',
    sa.Column('descricao', sa.String(length=50), nullable=False),
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('descricao')
    )
    op.create_index(op.f('ix_tipos_usuario_id'), 'tipos_usuario', ['id'], unique=False)
    op.create_table('usuarios',
    sa.Column('email', sa.String(length=150), nullable=False),
    sa.Column('senha_hash', sa.String(length=255), nullable=False),
    sa.Column('ativo', sa.Boolean(), nullable=False),
    sa.Column('tipo_id', sa.Integer(), nullable=False),
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['tipo_id'], ['tipos_usuario.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True)
    op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_usuarios_id'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_table('usuarios')
    op.drop_index(op.f('ix_tipos_usuario_id'), table_name='tipos_usuario')
    op.drop_table('tipos_usuario')
    # ### end Alembic commands ###
