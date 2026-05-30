# PerfumeriaUTP_2

Proyecto web para gestionar inventario, reservas, entregas y reposicion de mercaderia de una perfumeria.

## Estructura

- `BD/`: conexion PostgreSQL y funciones SQL.
- `Modelo/`: objetos Python basados en tablas de la base de datos.
- `Controlador/`: reglas de negocio y llamadas a funciones/SP.
- `Vista/frontend/`: frontend React + Vite.
- `api.py`: API Flask que conecta el frontend React con el backend Python.
- `config/`: configuracion local.

## Ejecucion rapida

Con PostgreSQL activo, ejecuta un solo comando:

```powershell
.\.venv\Scripts\python.exe main.py
```

Tambien puedes usar:

```powershell
.\iniciar.bat
```

Ese comando prepara el frontend React si hace falta, levanta la API y abre el sistema en:

```text
http://127.0.0.1:5000
```

Si aparece un mensaje indicando que no existe `npm`, instala Node.js LTS desde `https://nodejs.org`, reinicia VS Code y vuelve a ejecutar el mismo comando.

## Backend manual

Instalar dependencias:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Levantar API:

```powershell
.\.venv\Scripts\python.exe api.py
```

La API corre en `http://127.0.0.1:5000/api`.

## Frontend manual

Instalar dependencias:

```powershell
cd .\Vista\frontend
..\..\.tools\node\npm.cmd install
```

Levantar Vite:

```powershell
..\..\.tools\node\node.exe .\node_modules\vite\bin\vite.js --host 127.0.0.1
```

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/registro`
- `GET /api/inventario`
- `GET /api/inventario/kpis`
- `GET /api/reservas?status=O`
- `POST /api/reservas`
- `PUT|PATCH /api/reservas/{reserv_id}/aprobar`
- `PUT|PATCH /api/reservas/{reserv_id}/cancelar`
- `POST /api/entregas/{reserv_id}/despachar`
- `GET /api/reposiciones?status=O`
- `POST /api/reposiciones`
- `PUT|PATCH /api/reposiciones/{reposicion_id}/aprobar`
- `POST /api/reposiciones/{reposicion_id}/entrada`
- `PUT|PATCH /api/reposiciones/{reposicion_id}/cancelar`

## Procesos

- Usuario crea reserva en estado `O`.
- Admin aprueba reserva: pasa a `A` y afecta `stock.comprometido`.
- Admin registra entrega: genera entrega desde reserva, cierra la reserva, libera comprometido y resta stock fisico.
- Si no hay stock, la reserva falla y el usuario puede crear una orden de reposicion.
- Admin aprueba orden de reposicion: pasa a `A` y afecta `stock.pedido`.
- Admin genera entrada desde reposicion: cierra la orden, libera pedido y aumenta stock fisico.
- Admin puede cancelar reservas u ordenes abiertas/aprobadas, liberando inventario cuando corresponde.
