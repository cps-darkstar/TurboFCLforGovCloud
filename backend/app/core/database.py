"""
Enterprise Database Configuration and Connection Management

This module provides database connection management, session handling,
and audit trail functionality for the TurboFCL enterprise system.
Includes connection pooling, transaction management, and security features.
"""

import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from functools import wraps
from typing import Any, AsyncGenerator, Dict, List, Optional

import asyncpg
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

from ..core.config import settings
from ..core.exceptions import DatabaseError, SecurityError

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Enterprise database manager with connection pooling and security features."""

    def __init__(self):
        self.engine: Optional[Engine] = None
        self.async_engine: Optional[create_async_engine] = None
        self.session_factory: Optional[sessionmaker] = None
        self.async_session_factory: Optional[async_sessionmaker] = None
        self._initialized = False

    def initialize(self):
        """Initialize database connections and session factories."""
        if self._initialized:
            return

        try:
            # Create synchronous engine
            self.engine = create_engine(
                settings.DATABASE_URL,
                poolclass=QueuePool,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_pre_ping=True,
                pool_recycle=3600,  # Recycle connections every hour
                echo=settings.DB_ECHO,
                connect_args={
                    "sslmode": (
                        "require" if settings.ENVIRONMENT == "production" else "prefer"
                    ),
                    "application_name": f"turbofcl-{settings.ENVIRONMENT}",
                    "connect_timeout": 30,
                },
            )

            # Create async engine
            async_database_url = settings.DATABASE_URL.replace(
                "postgresql://", "postgresql+asyncpg://"
            )
            self.async_engine = create_async_engine(
                async_database_url,
                poolclass=QueuePool,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=settings.DB_ECHO,
                connect_args={
                    "ssl": (
                        "require" if settings.ENVIRONMENT == "production" else "prefer"
                    ),
                    "server_settings": {
                        "application_name": f"turbofcl-async-{settings.ENVIRONMENT}",
                        "jit": "off",
                    },
                },
            )

            # Create session factories
            self.session_factory = sessionmaker(
                bind=self.engine,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )

            self.async_session_factory = async_sessionmaker(
                bind=self.async_engine,
                class_=AsyncSession,
                autocommit=False,
                autoflush=False,
                expire_on_commit=False,
            )

            # Set up event listeners for security and auditing
            self._setup_event_listeners()

            self._initialized = True
            logger.info("Database manager initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize database manager: {e}")
            raise DatabaseError(f"Database initialization failed: {str(e)}")

    def _setup_event_listeners(self):
        """Set up SQLAlchemy event listeners for security and auditing."""

        @event.listens_for(self.engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """Set security-related connection parameters."""
            if hasattr(dbapi_connection, "execute"):
                # Set row-level security context
                dbapi_connection.execute("SET row_security = on")
                dbapi_connection.execute("SET search_path = enterprise, public")

        @event.listens_for(self.engine, "before_cursor_execute")
        def log_queries(conn, cursor, statement, parameters, context, executemany):
            """Log database queries for audit purposes."""
            if settings.DB_AUDIT_LOGGING:
                logger.info(f"Executing query: {statement[:200]}...")

    @asynccontextmanager
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get an async database session with proper cleanup."""
        if not self._initialized:
            self.initialize()

        async with self.async_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise DatabaseError(f"Database operation failed: {str(e)}")
            finally:
                await session.close()

    def get_session(self) -> Session:
        """Get a synchronous database session."""
        if not self._initialized:
            self.initialize()

        return self.session_factory()

    async def health_check(self) -> Dict[str, Any]:
        """Perform database health check."""
        try:
            async with self.get_async_session() as session:
                result = await session.execute(text("SELECT 1"))
                row = result.fetchone()

                if row and row[0] == 1:
                    return {
                        "status": "healthy",
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "database": "connected",
                    }
                else:
                    raise DatabaseError("Unexpected health check result")

        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "unhealthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e),
            }

    async def close(self):
        """Close database connections."""
        if self.async_engine:
            await self.async_engine.dispose()
        if self.engine:
            self.engine.dispose()

        self._initialized = False
        logger.info("Database connections closed")


# Global database manager instance
db_manager = DatabaseManager()


# Dependency for FastAPI
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency for getting database sessions."""
    async with db_manager.get_async_session() as session:
        yield session


def get_sync_db_session() -> Session:
    """Get synchronous database session for scripts and utilities."""
    return db_manager.get_session()


class AuditLogger:
    """Enterprise audit logging for database operations."""

    @staticmethod
    async def log_operation(
        session: AsyncSession,
        operation_type: str,
        table_name: str,
        record_id: Optional[str] = None,
        user_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """Log an audit event to the database."""
        try:
            audit_data = {
                "operation_type": operation_type,
                "table_name": table_name,
                "record_id": record_id,
                "user_id": user_id,
                "changes": changes,
                "metadata": metadata,
                "timestamp": datetime.now(timezone.utc),
            }

            # Insert into audit_logs table
            query = text(
                """
                INSERT INTO enterprise.audit_logs 
                (operation_type, table_name, record_id, user_id, changes, metadata, timestamp)
                VALUES (:operation_type, :table_name, :record_id, :user_id, :changes, :metadata, :timestamp)
            """
            )

            await session.execute(query, audit_data)

        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            # Don't raise exception to avoid disrupting main operation


def audit_operation(operation_type: str, table_name: str):
    """Decorator for automatically auditing database operations."""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            session = None
            user_id = None

            # Try to extract session and user_id from arguments
            for arg in args:
                if isinstance(arg, AsyncSession):
                    session = arg
                    break

            if "user_id" in kwargs:
                user_id = kwargs["user_id"]

            # Execute the operation
            try:
                result = await func(*args, **kwargs)

                # Log successful operation
                if session:
                    await AuditLogger.log_operation(
                        session=session,
                        operation_type=operation_type,
                        table_name=table_name,
                        user_id=user_id,
                        metadata={"function": func.__name__, "status": "success"},
                    )

                return result

            except Exception as e:
                # Log failed operation
                if session:
                    await AuditLogger.log_operation(
                        session=session,
                        operation_type=operation_type,
                        table_name=table_name,
                        user_id=user_id,
                        metadata={
                            "function": func.__name__,
                            "status": "error",
                            "error": str(e),
                        },
                    )
                raise

        return wrapper

    return decorator


class TransactionManager:
    """Advanced transaction management with savepoints and rollback handling."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.savepoints: List[str] = []

    async def create_savepoint(self, name: str) -> str:
        """Create a named savepoint."""
        try:
            await self.session.execute(text(f"SAVEPOINT {name}"))
            self.savepoints.append(name)
            return name
        except Exception as e:
            raise DatabaseError(f"Failed to create savepoint {name}: {str(e)}")

    async def rollback_to_savepoint(self, name: str):
        """Rollback to a specific savepoint."""
        try:
            if name not in self.savepoints:
                raise DatabaseError(f"Savepoint {name} not found")

            await self.session.execute(text(f"ROLLBACK TO SAVEPOINT {name}"))

            # Remove savepoints created after this one
            index = self.savepoints.index(name)
            self.savepoints = self.savepoints[: index + 1]

        except Exception as e:
            raise DatabaseError(f"Failed to rollback to savepoint {name}: {str(e)}")

    async def release_savepoint(self, name: str):
        """Release a savepoint."""
        try:
            if name not in self.savepoints:
                raise DatabaseError(f"Savepoint {name} not found")

            await self.session.execute(text(f"RELEASE SAVEPOINT {name}"))
            self.savepoints.remove(name)

        except Exception as e:
            raise DatabaseError(f"Failed to release savepoint {name}: {str(e)}")


# Database utilities
async def execute_with_retry(
    session: AsyncSession,
    query: text,
    params: Optional[Dict[str, Any]] = None,
    max_retries: int = 3,
) -> Any:
    """Execute a query with retry logic for transient failures."""
    last_exception = None

    for attempt in range(max_retries):
        try:
            result = await session.execute(query, params or {})
            return result
        except SQLAlchemyError as e:
            last_exception = e
            if attempt < max_retries - 1:
                wait_time = 2**attempt  # Exponential backoff
                logger.warning(
                    f"Query failed (attempt {attempt + 1}), retrying in {wait_time}s: {e}"
                )
                await asyncio.sleep(wait_time)
            else:
                logger.error(f"Query failed after {max_retries} attempts: {e}")
                break

    raise DatabaseError(
        f"Query execution failed after {max_retries} attempts: {str(last_exception)}"
    )


# Initialize database on module import
def initialize_database():
    """Initialize the database manager."""
    try:
        db_manager.initialize()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


# Export key components
__all__ = [
    "DatabaseManager",
    "db_manager",
    "get_db_session",
    "get_sync_db_session",
    "AuditLogger",
    "audit_operation",
    "TransactionManager",
    "execute_with_retry",
    "initialize_database",
]
