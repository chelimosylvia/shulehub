"""Update User model for new login system

Revision ID: 02d5e93c59ff
Revises: 63d359a23148
Create Date: 2025-06-16 10:59:06.579859

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '02d5e93c59ff'
down_revision = '63d359a23148'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('admission_number', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('tsc_number', sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column('grade_level', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('subject', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('must_change_password', sa.Boolean(), nullable=True))
        batch_op.alter_column('email',
               existing_type=sa.VARCHAR(length=120),
               nullable=True)
        batch_op.create_unique_constraint(None, ['tsc_number'])
        batch_op.create_unique_constraint(None, ['admission_number'])

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='unique')
        batch_op.drop_constraint(None, type_='unique')
        batch_op.alter_column('email',
               existing_type=sa.VARCHAR(length=120),
               nullable=False)
        batch_op.drop_column('must_change_password')
        batch_op.drop_column('subject')
        batch_op.drop_column('grade_level')
        batch_op.drop_column('tsc_number')
        batch_op.drop_column('admission_number')

    # ### end Alembic commands ###
