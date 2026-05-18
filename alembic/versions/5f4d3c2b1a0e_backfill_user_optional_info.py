"""backfill user optional info

Revision ID: 5f4d3c2b1a0e
Revises: 0e2a4c8a9d1b
Create Date: 2026-05-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '5f4d3c2b1a0e'
down_revision: Union[str, Sequence[str], None] = '0e2a4c8a9d1b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute(
        """
        INSERT INTO user_optional_info (user_id)
        SELECT users.id
        FROM users
        LEFT JOIN user_optional_info
            ON user_optional_info.user_id = users.id
        WHERE user_optional_info.user_id IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    pass
