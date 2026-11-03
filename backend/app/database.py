import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .models import CREATE_TABLES

DATABASE_PATH = Path(
    os.environ.get(
        "WAREHOUSE_DB_PATH",
        str(Path(__file__).resolve().parent.parent / "warehouse.db"),
    )
)


def connect() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def initialize_database() -> None:
    with connect() as connection:
        connection.executescript(CREATE_TABLES)


@contextmanager
def database_session() -> Iterator[sqlite3.Connection]:
    connection = connect()
    try:
        with connection:
            yield connection
    finally:
        connection.close()