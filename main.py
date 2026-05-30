from __future__ import annotations

import shutil
import subprocess
import sys
import webbrowser
import os
from pathlib import Path

from api import FRONTEND_DIST, crear_app


BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR / "Vista" / "frontend"
PACKAGE_JSON = FRONTEND_DIR / "package.json"
PACKAGE_LOCK = FRONTEND_DIR / "package-lock.json"
NODE_MODULES = FRONTEND_DIR / "node_modules"
VITE_JS = NODE_MODULES / "vite" / "bin" / "vite.js"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"
URL = "http://127.0.0.1:5000"


def main() -> None:
    print("Preparando Perfumeria UTP...")
    preparar_frontend()

    app = crear_app()
    print(f"Sistema listo: {URL}")
    print("Presiona CTRL+C para detener el programa.")
    if os.environ.get("PERFUMERIA_NO_BROWSER") != "1":
        webbrowser.open(URL)
    app.run(host="127.0.0.1", port=5000, debug=False)


def preparar_frontend() -> None:
    if not PACKAGE_JSON.exists():
        return

    npm = buscar_npm()
    if npm is None:
        if FRONTEND_INDEX.exists():
            print("npm no esta disponible; usando el frontend ya compilado.")
            return

        print("\nNo se encontro npm en Windows.")
        print("Instala Node.js LTS desde https://nodejs.org y reinicia VS Code.")
        print("Luego ejecuta:")
        print(r".\.venv\Scripts\python.exe main.py")
        sys.exit(1)

    if not NODE_MODULES.exists():
        ejecutar([npm, "install"], "Instalando dependencias del frontend...")

    if frontend_necesita_build():
        node = buscar_node()
        if node and VITE_JS.exists():
            ejecutar([node, str(VITE_JS), "build"], "Compilando frontend...")
        else:
            ejecutar([npm, "run", "build"], "Compilando frontend...")


def frontend_necesita_build() -> bool:
    if not FRONTEND_INDEX.exists():
        return True

    build_time = FRONTEND_INDEX.stat().st_mtime
    candidatos = [PACKAGE_JSON, PACKAGE_LOCK, FRONTEND_DIR / "index.html", FRONTEND_DIR / "vite.config.js"]
    candidatos.extend((FRONTEND_DIR / "src").rglob("*"))
    candidatos.extend((FRONTEND_DIR / "public").rglob("*"))

    return any(archivo.is_file() and archivo.stat().st_mtime > build_time for archivo in candidatos)


def buscar_npm() -> str | None:
    npm_local = BASE_DIR / ".tools" / "node" / "npm.cmd"
    if npm_local.exists():
        return str(npm_local)

    for comando in ("npm.cmd", "npm"):
        ruta = shutil.which(comando)
        if ruta:
            return ruta

    rutas_comunes = [
        Path("C:/Program Files/nodejs/npm.cmd"),
        Path("C:/Program Files (x86)/nodejs/npm.cmd"),
    ]

    for ruta in rutas_comunes:
        if ruta.exists():
            return str(ruta)

    return None


def buscar_node() -> str | None:
    node_local = BASE_DIR / ".tools" / "node" / "node.exe"
    if node_local.exists():
        return str(node_local)

    ruta = shutil.which("node")
    if ruta:
        return ruta

    rutas_comunes = [
        Path("C:/Program Files/nodejs/node.exe"),
        Path("C:/Program Files (x86)/nodejs/node.exe"),
    ]

    for ruta_comun in rutas_comunes:
        if ruta_comun.exists():
            return str(ruta_comun)

    return None


def ejecutar(comando: list[str], mensaje: str) -> None:
    print(mensaje)
    env = os.environ.copy()
    node = buscar_node()
    if node:
        node_dir = str(Path(node).resolve().parent)
        env["PATH"] = node_dir + os.pathsep + env.get("PATH", "")

    try:
        subprocess.run(comando, cwd=FRONTEND_DIR, check=True, env=env)
    except subprocess.CalledProcessError as error:
        print(f"No se pudo completar el comando: {' '.join(comando)}")
        raise SystemExit(error.returncode) from error


if __name__ == "__main__":
    main()
