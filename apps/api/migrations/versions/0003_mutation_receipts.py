"""Transactional idempotency receipts for retried writes."""

from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "mutation_receipts",
        sa.Column("scope_key", sa.String(64), primary_key=True),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("owner_hash", sa.String(64), nullable=True),
        sa.Column("response", sa.JSON(), nullable=False),
        sa.Column("status_code", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_mutation_receipts_owner_hash", "mutation_receipts", ["owner_hash"]
    )


def downgrade():
    op.drop_index("ix_mutation_receipts_owner_hash", "mutation_receipts")
    op.drop_table("mutation_receipts")
