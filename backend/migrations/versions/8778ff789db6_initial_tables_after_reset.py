"""Initial tables after reset

Revision ID: 8778ff789db6
Revises: 
Create Date: 2025-06-11 19:19:13.772902

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '8778ff789db6'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('password_hash', sa.String(length=255), nullable=False),
    sa.Column('first_name', sa.String(length=50), nullable=False),
    sa.Column('last_name', sa.String(length=50), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=True),
    sa.Column('role', sa.Enum('student', 'teacher', 'admin', name='user_roles'), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_users_email'), ['email'], unique=True)

    op.create_table('notifications',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('read', sa.Boolean(), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('schools',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('address', sa.String(length=300), nullable=False),
    sa.Column('phone', sa.String(length=20), nullable=False),
    sa.Column('email', sa.String(length=120), nullable=False),
    sa.Column('website', sa.String(length=200), nullable=True),
    sa.Column('established_year', sa.Integer(), nullable=True),
    sa.Column('school_type', sa.Enum('public', 'private', 'international', name='school_types'), nullable=False),
    sa.Column('county', sa.String(length=100), nullable=False),
    sa.Column('sub_county', sa.String(length=100), nullable=True),
    sa.Column('ward', sa.String(length=100), nullable=True),
    sa.Column('registration_number', sa.String(length=50), nullable=False),
    sa.Column('is_verified', sa.Boolean(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('owner_id', sa.Integer(), nullable=False),
    sa.Column('level', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('email'),
    sa.UniqueConstraint('registration_number')
    )
    op.create_table('resources',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('school_id', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('resource_type', sa.Enum('notes', 'book', 'video', 'audio', 'other', name='resource_types'), nullable=True),
    sa.Column('url', sa.String(length=500), nullable=True),
    sa.Column('uploaded_by', sa.Integer(), nullable=True),
    sa.Column('uploaded_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
    sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('school_classes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('level', sa.String(length=50), nullable=False),
    sa.Column('stream', sa.String(length=10), nullable=True),
    sa.Column('capacity', sa.Integer(), nullable=True),
    sa.Column('current_enrollment', sa.Integer(), nullable=True),
    sa.Column('school_id', sa.Integer(), nullable=False),
    sa.Column('teacher_id', sa.Integer(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
    sa.ForeignKeyConstraint(['teacher_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assessments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('class_id', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=100), nullable=False),
    sa.Column('title', sa.String(length=200), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('max_score', sa.Float(), nullable=False),
    sa.Column('exam_date', sa.Date(), nullable=False),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['school_classes.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('attendance_records',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('class_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.Column('status', sa.Enum('present', 'absent', 'late', 'excused', name='attendance_status'), nullable=True),
    sa.Column('remarks', sa.String(length=255), nullable=True),
    sa.Column('recorded_by', sa.Integer(), nullable=True),
    sa.Column('timestamp', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['school_classes.id'], ),
    sa.ForeignKeyConstraint(['recorded_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('classroom_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('school_id', sa.Integer(), nullable=False),
    sa.Column('class_id', sa.Integer(), nullable=False),
    sa.Column('session_name', sa.String(length=200), nullable=True),
    sa.Column('start_time', sa.DateTime(), nullable=False),
    sa.Column('end_time', sa.DateTime(), nullable=True),
    sa.Column('created_by', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['school_classes.id'], ),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('enrollments',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('school_id', sa.Integer(), nullable=False),
    sa.Column('class_id', sa.Integer(), nullable=True),
    sa.Column('admission_number', sa.String(length=50), nullable=True),
    sa.Column('enrollment_date', sa.Date(), nullable=True),
    sa.Column('status', sa.Enum('active', 'inactive', 'graduated', 'transferred', name='enrollment_status'), nullable=True),
    sa.Column('academic_year', sa.String(length=20), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['school_classes.id'], ),
    sa.ForeignKeyConstraint(['school_id'], ['schools.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('admission_number'),
    sa.UniqueConstraint('user_id', 'school_id', 'academic_year', name='unique_user_school_year')
    )
    op.create_table('grade_entries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('class_id', sa.Integer(), nullable=False),
    sa.Column('subject', sa.String(length=100), nullable=False),
    sa.Column('grade', sa.String(length=10), nullable=False),
    sa.Column('comments', sa.Text(), nullable=True),
    sa.Column('recorded_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['class_id'], ['school_classes.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assessment_results',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('assessment_id', sa.Integer(), nullable=False),
    sa.Column('student_id', sa.Integer(), nullable=False),
    sa.Column('score', sa.Float(), nullable=False),
    sa.Column('feedback', sa.Text(), nullable=True),
    sa.Column('recorded_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['assessment_id'], ['assessments.id'], ),
    sa.ForeignKeyConstraint(['student_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('chat_messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('session_id', sa.Integer(), nullable=False),
    sa.Column('sender_id', sa.Integer(), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('timestamp', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['session_id'], ['classroom_sessions.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('chat_messages')
    op.drop_table('assessment_results')
    op.drop_table('grade_entries')
    op.drop_table('enrollments')
    op.drop_table('classroom_sessions')
    op.drop_table('attendance_records')
    op.drop_table('assessments')
    op.drop_table('school_classes')
    op.drop_table('resources')
    op.drop_table('schools')
    op.drop_table('notifications')
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_users_email'))

    op.drop_table('users')
    # ### end Alembic commands ###
