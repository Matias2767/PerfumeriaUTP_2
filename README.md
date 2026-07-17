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

Con PostgreSQL activo y los archivos `.env` configurados, ejecuta:

```powershell
.\venv\Scripts\python.exe main.py
```

Tambien puedes usar:

```powershell
.\iniciar.bat
```

Ese comando prepara el frontend React si hace falta, levanta la API y abre el sistema en:

```text
http://localhost:5000
```

Si aparece un mensaje indicando que no existe `npm`, instala Node.js LTS desde `https://nodejs.org`, reinicia VS Code y vuelve a ejecutar el mismo comando.

## Configuracion

Crear entorno virtual e instalar dependencias del backend:

```powershell
py -m venv venv
.\venv\Scripts\python.exe -m pip install --upgrade pip
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Crear configuracion local del backend:

```powershell
Copy-Item .\config\.env.example .\config\.env
```

Edita `config/.env` y define la contrasena local de PostgreSQL. La base esperada es:

```text
PGDATABASE=perfumeriautp
```

Crear configuracion local del frontend:

```powershell
Copy-Item .\Vista\frontend\.env.example .\Vista\frontend\.env
```

Instalar dependencias del frontend:

```powershell
cd .\Vista\frontend
& "C:\Program Files\nodejs\npm.cmd" ci
cd ..\..
```

## Backend manual

Instalar dependencias:

```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
```

Levantar API:

```powershell
.\venv\Scripts\python.exe api.py
```

La API corre en `http://localhost:5000/api` y escucha en el host/puerto definidos por `BACKEND_HOST` y `BACKEND_PORT`.

## Frontend manual

Instalar dependencias:

```powershell
cd .\Vista\frontend
& "C:\Program Files\nodejs\npm.cmd" ci
```

Levantar Vite:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Generar compilacion de produccion:

```powershell
& "C:\Program Files\nodejs\npm.cmd" run build
```

## Acceso por red local

Para acceder desde otra computadora de la misma red, configura el frontend con la IP del equipo servidor:

```env
VITE_API_URL=http://IP_DEL_SERVIDOR:5000/api
```

Y permite ese origen en el backend:

```env
FRONTEND_ORIGIN=http://IP_DEL_SERVIDOR:5173
```

El backend debe escuchar en:

```env
BACKEND_HOST=0.0.0.0
BACKEND_PORT=5000
```

Vite debe escuchar en:

```env
VITE_DEV_HOST=0.0.0.0
VITE_DEV_PORT=5173
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
