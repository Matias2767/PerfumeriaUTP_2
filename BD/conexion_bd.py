from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterable

import psycopg
from dotenv import load_dotenv
from psycopg import sql
from psycopg.rows import dict_row


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / "config" / ".env")


class ConexionBD:
    """Conexion reutilizable para PostgreSQL."""

    def __init__(
        self,
        host: str = "localhost",
        port: int = 5432,
        database: str = "perfumeriautp",
        user: str | None = None,
        password: str | None = None,
    ) -> None:
        if not user:
            raise ValueError("Falta configurar PGUSER en config/.env.")
        if not password:
            raise ValueError("Falta configurar PGPASSWORD en config/.env.")

        self.config = {
            "host": host,
            "port": port,
            "dbname": database,
            "user": user,
            "password": password,
        }

    @classmethod
    def desde_entorno(cls) -> "ConexionBD":
        return cls(
            host=os.getenv("PGHOST", "localhost"),
            port=int(os.getenv("PGPORT", "5432")),
            database=os.getenv("PGDATABASE", "perfumeriautp"),
            user=os.getenv("PGUSER"),
            password=os.getenv("PGPASSWORD"),
        )

    @contextmanager
    def conectar(self):
        with psycopg.connect(**self.config, row_factory=dict_row) as conexion:
            yield conexion

    def consultar(self, consulta: str, parametros: Iterable[Any] | None = None) -> list[dict[str, Any]]:
        with self.conectar() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(consulta, parametros)
                return cursor.fetchall()

    def ejecutar(self, consulta: str, parametros: Iterable[Any] | None = None) -> int:
        with self.conectar() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(consulta, parametros)
                conexion.commit()
                return cursor.rowcount

    @contextmanager
    def transaccion(self):
        with self.conectar() as conexion:
            with conexion.transaction():
                yield conexion

    def llamar_funcion(
        self,
        nombre: str,
        parametros: Iterable[Any] | None = None,
        esquema: str | None = None,
    ) -> list[dict[str, Any]]:
        valores = list(parametros or [])
        identificador = self._identificador(nombre, esquema)
        placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in valores)
        consulta = sql.SQL("SELECT * FROM {}({})").format(identificador, placeholders)

        with self.conectar() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(consulta, valores)
                return cursor.fetchall()

    def llamar_procedimiento(
        self,
        nombre: str,
        parametros: Iterable[Any] | None = None,
        esquema: str | None = None,
    ) -> list[dict[str, Any]] | int:
        valores = list(parametros or [])
        identificador = self._identificador(nombre, esquema)
        placeholders = sql.SQL(", ").join(sql.Placeholder() for _ in valores)
        consulta = sql.SQL("CALL {}({})").format(identificador, placeholders)

        with self.conectar() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute(consulta, valores)
                conexion.commit()
                return cursor.fetchall() if cursor.description else cursor.rowcount

    @staticmethod
    def _identificador(nombre: str, esquema: str | None = None) -> sql.Composable:
        if esquema:
            return sql.Identifier(esquema, nombre)
        return sql.Identifier(nombre)


bd = ConexionBD.desde_entorno()
