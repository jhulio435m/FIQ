"""Release job: migrate the primary database and each configured resource shard."""
from alembic import command
from alembic.config import Config

from app.core.config import settings


def main() -> None:
    settings.validate_runtime()
    original = settings.DATABASE_URL
    urls = [original, *[url.strip() for url in settings.RESOURCE_SHARD_DATABASE_URLS.split(",") if url.strip()]]
    try:
        for url in dict.fromkeys(urls):
            settings.DATABASE_URL = url
            command.upgrade(Config("alembic.ini"), "head")
    finally:
        settings.DATABASE_URL = original


if __name__ == "__main__":
    main()
