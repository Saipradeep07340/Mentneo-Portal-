import psycopg
from psycopg.rows import dict_row
from contextlib import contextmanager
from app.core.config import settings
import logging

logger = logging.getLogger("mentneo.db")

@contextmanager
def get_db():
    """
    Context manager yielding a PostgreSQL connection with dict_row cursor.
    Thread-safe and handles transaction commit/rollback automatically.
    """
    conn = psycopg.connect(settings.DATABASE_URL, row_factory=dict_row)
    try:
        with conn.cursor() as cur:
            yield cur
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Database error: {e}")
        raise
    finally:
        conn.close()

def execute_query(query: str, params: tuple = None):
    with get_db() as cur:
        cur.execute(query, params or ())
        return cur.fetchall()

def execute_one(query: str, params: tuple = None):
    with get_db() as cur:
        cur.execute(query, params or ())
        return cur.fetchone()

def execute_commit(query: str, params: tuple = None):
    with get_db() as cur:
        cur.execute(query, params or ())
