"""Complete the cyclic published revision FK on PostgreSQL."""

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.create_foreign_key(
            "fk_published_revision",
            "discoveries",
            "experience_revisions",
            ["published_revision_id"],
            ["id"],
        )


def downgrade():
    if op.get_bind().dialect.name == "postgresql":
        op.drop_constraint("fk_published_revision", "discoveries", type_="foreignkey")
