"""add hashtags for recommendations

Revision ID: a7d2f4c9b8e1
Revises: 5f4d3c2b1a0e
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7d2f4c9b8e1'
down_revision: Union[str, Sequence[str], None] = '5f4d3c2b1a0e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'hashtags',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_hashtags_name'), 'hashtags', ['name'], unique=False)

    op.create_table(
        'posts_hashtags',
        sa.Column('post_id', sa.Integer(), nullable=False),
        sa.Column('hashtag_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['hashtag_id'], ['hashtags.id'], ),
        sa.ForeignKeyConstraint(['post_id'], ['posts.id'], ),
        sa.PrimaryKeyConstraint('post_id', 'hashtag_id'),
    )
    op.create_index(
        'ix_posts_hashtags_hashtag_id',
        'posts_hashtags',
        ['hashtag_id'],
        unique=False,
    )
    op.create_index(
        'ix_posts_users_likes_post_id',
        'posts_users_likes',
        ['post_id'],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_posts_users_likes_post_id', table_name='posts_users_likes')
    op.drop_index('ix_posts_hashtags_hashtag_id', table_name='posts_hashtags')
    op.drop_table('posts_hashtags')
    op.drop_index(op.f('ix_hashtags_name'), table_name='hashtags')
    op.drop_table('hashtags')
