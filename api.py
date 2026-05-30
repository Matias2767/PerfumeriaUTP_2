from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from functools import wraps
from pathlib import Path
from typing import Any, Callable

import psycopg
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

from BD.conexion_bd import bd
from Controlador.autenticacion import crear_usuario, iniciar_sesion, instalar_funciones_autenticacion
from Controlador.procesos import (
    DetalleMovimiento,
    aprobar_orden_reposicion,
    aprobar_reserva,
    cancelar_orden_reposicion,
    cancelar_reserva,
    crear_orden_reposicion,
    crear_reserva,
    entregar_reserva,
    generar_entrada_desde_reposicion,
    instalar_funciones_procesos,
)

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIST = BASE_DIR / "Vista" / "frontend" / "dist"


app = Flask(__name__, static_folder=None)
CORS(app)


def crear_app() -> Flask:
    instalar_funciones_autenticacion()
    instalar_funciones_procesos()
    return app


def requiere_sesion(fn: Callable):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user_id = _usuario_desde_token()
        if user_id is None:
            return _error("Sesion requerida.", 401)
        return fn(user_id, *args, **kwargs)

    return wrapper


@app.post("/api/auth/login")
def login():
    datos = request.get_json(silent=True) or {}
    identificador = datos.get("email") or datos.get("user_name") or datos.get("usuario")
    password = datos.get("password") or datos.get("user_password")

    if not identificador or not password:
        return _error("Usuario/correo y contrasena son obligatorios.", 400)

    sesion = iniciar_sesion(identificador, password)
    if sesion is None:
        return _error("Credenciales incorrectas.", 401)

    return jsonify(
        {
            "token": f"user:{sesion.user_id}",
            "user": {
                "id": sesion.user_id,
                "user_id": sesion.user_id,
                "nombre": sesion.nombre_completo,
                "user_name": sesion.user_name,
                "role_id": sesion.role_id,
                "role_name": sesion.role_name,
                "admin": sesion.admin,
            },
        }
    )


@app.post("/api/auth/registro")
def registro():
    datos = request.get_json(silent=True) or {}

    try:
        usuario = crear_usuario(
            user_name=datos.get("user_name") or datos.get("usuario") or datos.get("email"),
            user_password=datos.get("password") or datos.get("user_password"),
            u_pnombre=datos.get("u_pnombre") or datos.get("primer_nombre") or datos.get("nombre"),
            u_snombre=datos.get("u_snombre") or datos.get("segundo_nombre"),
            u_papellido=datos.get("u_papellido") or datos.get("primer_apellido") or datos.get("apellido"),
            u_sapellido=datos.get("u_sapellido") or datos.get("segundo_apellido"),
            u_fechanacimiento=_fecha_o_none(datos.get("u_fechanacimiento") or datos.get("fecha_nacimiento")),
            gender_id=datos.get("gender_id"),
            u_correo=datos.get("u_correo") or datos.get("email"),
            u_telefono=datos.get("u_telefono") or datos.get("telefono"),
            u_estudianteutp=datos.get("u_estudianteutp", True),
        )
    except (TypeError, ValueError, psycopg.Error) as error:
        return _error(str(error), 400)

    return jsonify(_normalizar(usuario.a_dict())), 201


@app.get("/api/inventario")
@requiere_sesion
def listar_inventario(_user_id: int):
    filas = bd.consultar(
        """
        SELECT
            product_id AS id,
            product_id,
            product_name AS nombre_producto,
            product_description AS descripcion,
            group_name AS grupo,
            brand_name AS marca,
            family_name AS familia,
            gender_name AS genero,
            concent_name AS concentracion,
            volume,
            COALESCE(price, 0) AS precio,
            COALESCE(cost, 0) AS costo,
            COALESCE(stock, 0) AS stock,
            COALESCE(pedido, 0) AS pedido,
            COALESCE(comprometido, 0) AS comprometido,
            COALESCE(disponible, 0) AS disponible,
            active
        FROM vw_catalogo_productos
        ORDER BY product_name
        """
    )
    return jsonify(_normalizar(filas))


@app.get("/api/inventario/kpis")
@requiere_sesion
def kpis(_user_id: int):
    filas = bd.consultar(
        """
        SELECT
            COALESCE(SUM(stock), 0) AS stock,
            COALESCE(SUM(disponible), 0) AS disponible,
            COALESCE(SUM(comprometido), 0) AS comprometido,
            (SELECT COUNT(*) FROM reservas_c WHERE status = 'O') AS abiertas
        FROM stock
        """
    )
    return jsonify(_normalizar(filas[0]))


@app.get("/api/reservas")
@requiere_sesion
def listar_reservas(_user_id: int):
    status = request.args.get("status")
    limit = request.args.get("limit", type=int)
    parametros: list[Any] = []
    filtro = ""

    if status:
        filtro = "WHERE rc.status = %s"
        parametros.append(status)

    consulta = f"""
        SELECT
            rc.reserv_id AS id,
            rc.reserv_id,
            CONCAT_WS(' ', u.u_pnombre, u.u_snombre, u.u_papellido, u.u_sapellido) AS cliente,
            STRING_AGG(p.product_name, ', ' ORDER BY rd.line_id) AS producto,
            SUM(rd.quantity) AS cantidad,
            rc.system_date AS fecha_creacion,
            rc.planning_date,
            rc.status
        FROM reservas_c rc
        JOIN usuarios u ON u.user_id = rc.user_id
        JOIN reservas_d rd ON rd.reserv_id = rc.reserv_id
        JOIN productos p ON p.product_id = rd.product_id
        {filtro}
        GROUP BY rc.reserv_id, u.user_id
        ORDER BY rc.system_date DESC, rc.reserv_id DESC
    """

    if limit:
        consulta += " LIMIT %s"
        parametros.append(limit)

    return jsonify(_normalizar(bd.consultar(consulta, parametros)))


@app.post("/api/reservas")
@requiere_sesion
def crear_reserva_api(user_id: int):
    datos = request.get_json(silent=True) or {}
    product_id = datos.get("producto_id") or datos.get("product_id")
    cantidad = datos.get("cantidad") or datos.get("quantity")
    planning_date = _fecha_o_none(datos.get("planning_date")) or date.today()

    if not product_id or not cantidad:
        return _error("Producto y cantidad son obligatorios.", 400)

    try:
        reserv_id = crear_reserva(
            user_id=user_id,
            planning_date=planning_date,
            detalles=[
                DetalleMovimiento(
                    product_id=int(product_id),
                    quantity=Decimal(str(cantidad)),
                )
            ],
        )
    except (ValueError, psycopg.Error) as error:
        return _error(str(error), 400)

    return jsonify({"id": reserv_id, "reserv_id": reserv_id, "status": "O"}), 201


@app.route("/api/reservas/<int:reserv_id>/aprobar", methods=["PUT", "PATCH"])
@requiere_sesion
def aprobar_reserva_api(user_id: int, reserv_id: int):
    try:
        aprobar_reserva(admin_user_id=user_id, reserv_id=reserv_id)
    except psycopg.Error as error:
        return _error(str(error), 400)
    return jsonify({"id": reserv_id, "reserv_id": reserv_id, "status": "A"})


@app.route("/api/reservas/<int:reserv_id>/cancelar", methods=["PUT", "PATCH"])
@requiere_sesion
def cancelar_reserva_api(user_id: int, reserv_id: int):
    try:
        cancelar_reserva(admin_user_id=user_id, reserv_id=reserv_id)
    except psycopg.Error as error:
        return _error(str(error), 400)
    return jsonify({"id": reserv_id, "reserv_id": reserv_id, "status": "D"})


@app.post("/api/entregas/<int:reserv_id>/despachar")
@requiere_sesion
def despachar_reserva_api(user_id: int, reserv_id: int):
    datos = request.get_json(silent=True) or {}
    delivery_date = _fecha_o_none(datos.get("fecha_entrega")) or date.today()

    try:
        delivery_id = entregar_reserva(
            admin_user_id=user_id,
            reserv_id=reserv_id,
            delivery_date=delivery_date,
        )
    except psycopg.Error as error:
        return _error(str(error), 400)

    return jsonify({"id": delivery_id, "delivery_id": delivery_id, "reserv_id": reserv_id})


@app.get("/api/reposiciones")
@requiere_sesion
def listar_reposiciones(_user_id: int):
    status = request.args.get("status")
    parametros: list[Any] = []
    filtro = ""

    if status:
        filtro = "WHERE oc.status = %s"
        parametros.append(status)

    filas = bd.consultar(
        f"""
        SELECT
            oc.reposicion_id AS id,
            oc.reposicion_id,
            CONCAT_WS(' ', u.u_pnombre, u.u_snombre, u.u_papellido, u.u_sapellido) AS solicitante,
            STRING_AGG(p.product_name, ', ' ORDER BY od.line_id) AS producto,
            SUM(od.quantity) AS cantidad,
            SUM(od.subtotal) AS total,
            oc.tipo_ingreso,
            oc.needed_date,
            oc.system_date AS fecha_creacion,
            oc.status,
            oc.comment
        FROM orden_reposicion_c oc
        JOIN usuarios u ON u.user_id = oc.user_id
        JOIN orden_reposicion_d od ON od.reposicion_id = oc.reposicion_id
        JOIN productos p ON p.product_id = od.product_id
        {filtro}
        GROUP BY oc.reposicion_id, u.user_id
        ORDER BY oc.system_date DESC, oc.reposicion_id DESC
        """,
        parametros,
    )
    return jsonify(_normalizar(filas))


@app.post("/api/reposiciones")
@requiere_sesion
def crear_reposicion_api(user_id: int):
    datos = request.get_json(silent=True) or {}
    detalles_payload = datos.get("detalles")

    if detalles_payload is None:
        product_id = datos.get("producto_id") or datos.get("product_id")
        cantidad = datos.get("cantidad") or datos.get("quantity")
        precio = datos.get("precio") or datos.get("price") or 0

        if not product_id or not cantidad:
            return _error("Producto y cantidad son obligatorios.", 400)

        detalles_payload = [
            {
                "product_id": product_id,
                "quantity": cantidad,
                "price": precio,
                "comment": datos.get("notas") or datos.get("comment"),
            }
        ]

    try:
        detalles = [
            DetalleMovimiento(
                product_id=int(item["product_id"]),
                quantity=Decimal(str(item["quantity"])),
                price=Decimal(str(item.get("price", 0))),
                comment=item.get("comment"),
            )
            for item in detalles_payload
        ]
        reposicion_id = crear_orden_reposicion(
            user_id=user_id,
            needed_date=_fecha_o_none(datos.get("needed_date")),
            tipo_ingreso=datos.get("tipo_ingreso", "COMPRA"),
            comment=datos.get("comment") or datos.get("notas"),
            detalles=detalles,
        )
    except (KeyError, ValueError, psycopg.Error) as error:
        return _error(str(error), 400)

    return jsonify({"id": reposicion_id, "reposicion_id": reposicion_id, "status": "O"}), 201


@app.route("/api/reposiciones/<int:reposicion_id>/aprobar", methods=["PUT", "PATCH"])
@requiere_sesion
def aprobar_reposicion_api(user_id: int, reposicion_id: int):
    try:
        aprobar_orden_reposicion(admin_user_id=user_id, reposicion_id=reposicion_id)
    except psycopg.Error as error:
        return _error(str(error), 400)
    return jsonify({"id": reposicion_id, "reposicion_id": reposicion_id, "status": "A"})


@app.post("/api/reposiciones/<int:reposicion_id>/entrada")
@requiere_sesion
def generar_entrada_reposicion_api(user_id: int, reposicion_id: int):
    try:
        income_id = generar_entrada_desde_reposicion(admin_user_id=user_id, reposicion_id=reposicion_id)
    except psycopg.Error as error:
        return _error(str(error), 400)
    return jsonify({"id": income_id, "income_id": income_id, "reposicion_id": reposicion_id})


@app.route("/api/reposiciones/<int:reposicion_id>/cancelar", methods=["PUT", "PATCH"])
@requiere_sesion
def cancelar_reposicion_api(user_id: int, reposicion_id: int):
    try:
        cancelar_orden_reposicion(admin_user_id=user_id, reposicion_id=reposicion_id)
    except psycopg.Error as error:
        return _error(str(error), 400)
    return jsonify({"id": reposicion_id, "reposicion_id": reposicion_id, "status": "D"})


@app.get("/")
def servir_frontend_inicio():
    return _servir_frontend("index.html")


@app.get("/<path:path>")
def servir_frontend(path: str):
    if path.startswith("api/"):
        return _error("Endpoint no encontrado.", 404)

    destino = FRONTEND_DIST / path
    if destino.is_file():
        return send_from_directory(FRONTEND_DIST, path)

    return _servir_frontend("index.html")


def _usuario_desde_token() -> int | None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None

    token = auth.removeprefix("Bearer ").strip()
    if token.startswith("user:"):
        token = token.removeprefix("user:")

    try:
        return int(token)
    except ValueError:
        return None


def _fecha_o_none(valor: Any) -> date | None:
    if not valor:
        return None
    if isinstance(valor, date):
        return valor
    return date.fromisoformat(str(valor))


def _normalizar(valor: Any) -> Any:
    if isinstance(valor, Decimal):
        return float(valor)
    if isinstance(valor, (date, datetime)):
        return valor.isoformat()
    if isinstance(valor, list):
        return [_normalizar(item) for item in valor]
    if isinstance(valor, dict):
        return {clave: _normalizar(item) for clave, item in valor.items()}
    return valor


def _error(mensaje: str, status: int):
    return jsonify({"error": mensaje}), status


def _servir_frontend(path: str):
    if not (FRONTEND_DIST / "index.html").exists():
        return _error(
            "Frontend React no compilado. Ejecuta main.py para preparar la interfaz web.",
            503,
        )

    return send_from_directory(FRONTEND_DIST, path)


if __name__ == "__main__":
    crear_app().run(host="127.0.0.1", port=5000, debug=True)
