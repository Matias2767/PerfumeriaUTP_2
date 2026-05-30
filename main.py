from __future__ import annotations

import shutil
import subprocess
import sys
import webbrowser
from pathlib import Path

from api import FRONTEND_DIST, FRONTEND_FALLBACK, crear_app


BASE_DIR = Path(__file__).resolve().parent
PACKAGE_JSON = BASE_DIR / "package.json"
PACKAGE_LOCK = BASE_DIR / "package-lock.json"
NODE_MODULES = BASE_DIR / "node_modules"
FRONTEND_INDEX = FRONTEND_DIST / "index.html"
FALLBACK_INDEX = FRONTEND_FALLBACK / "index.html"
URL = "http://127.0.0.1:5000"


def main() -> None:
    print("Preparando Perfumeria UTP...")
    preparar_frontend()

    app = crear_app()
    print(f"Sistema listo: {URL}")
    print("Presiona CTRL+C para detener el programa.")
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
        if FALLBACK_INDEX.exists():
            print("npm no esta disponible; usando la interfaz web integrada sin React.")
            return

        print("\nNo se encontro npm en Windows.")
        print("Instala Node.js LTS desde https://nodejs.org y reinicia VS Code,")
        print("o conserva la carpeta web/ para usar la interfaz integrada.")
        print("Luego ejecuta:")
        print(r".\.venv\Scripts\python.exe main.py")
        sys.exit(1)

    if not NODE_MODULES.exists():
        ejecutar([npm, "install"], "Instalando dependencias del frontend...")

    if frontend_necesita_build():
        ejecutar([npm, "run", "build"], "Compilando frontend...")


def frontend_necesita_build() -> bool:
    if not FRONTEND_INDEX.exists():
        return True

    build_time = FRONTEND_INDEX.stat().st_mtime
    candidatos = [PACKAGE_JSON, PACKAGE_LOCK, BASE_DIR / "index.html", BASE_DIR / "vite.config.js"]
    candidatos.extend((BASE_DIR / "src").rglob("*"))
    candidatos.extend((BASE_DIR / "public").rglob("*"))

    return any(archivo.is_file() and archivo.stat().st_mtime > build_time for archivo in candidatos)


def buscar_npm() -> str | None:
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


def ejecutar(comando: list[str], mensaje: str) -> None:
    print(mensaje)
    try:
        subprocess.run(comando, cwd=BASE_DIR, check=True)
    except subprocess.CalledProcessError as error:
        print(f"No se pudo completar el comando: {' '.join(comando)}")
        raise SystemExit(error.returncode) from error


if __name__ == "__main__":
    main()
