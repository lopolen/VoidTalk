#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="$ROOT_DIR/.venv"
DATABASE_ENV_FILE="$ROOT_DIR/voidtalk_api/cfg/database_url.env"
FRONTEND_CONFIG_FILE="$ROOT_DIR/voidtalk_frontend/config.js"
FRONTEND_CONFIG_EXAMPLE="$ROOT_DIR/voidtalk_frontend/config.example.js"

echo "VoidTalk: налаштування dev-середовища"

if [ ! -d "$VENV_DIR" ]; then
    echo "Створюю .venv..."
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "Оновлюю pip..."
python -m pip install --upgrade pip

TEMP_REQUIREMENTS="$(mktemp)"
python - "$TEMP_REQUIREMENTS" <<'PY'
from pathlib import Path
import sys

target = Path(sys.argv[1])
source = Path("requirements.txt")
raw = source.read_bytes()

for encoding in ("utf-16", "utf-8-sig", "utf-8"):
    try:
        text = raw.decode(encoding)
        break
    except UnicodeDecodeError:
        continue
else:
    raise SystemExit("Не вдалося прочитати requirements.txt")

target.write_text(text, encoding="utf-8")
PY

echo "Встановлюю Python-пакети..."
python -m pip install -r "$TEMP_REQUIREMENTS"
rm -f "$TEMP_REQUIREMENTS"

mkdir -p "$(dirname "$DATABASE_ENV_FILE")"
if [ ! -f "$DATABASE_ENV_FILE" ]; then
    echo 'DATABASE_URL="sqlite:///./dev.db"' > "$DATABASE_ENV_FILE"
    echo "Створено $DATABASE_ENV_FILE"
fi

if [ ! -f "$FRONTEND_CONFIG_FILE" ] && [ -f "$FRONTEND_CONFIG_EXAMPLE" ]; then
    cp "$FRONTEND_CONFIG_EXAMPLE" "$FRONTEND_CONFIG_FILE"
    echo "Створено $FRONTEND_CONFIG_FILE"
fi

echo "Застосовую міграції..."
python -m alembic upgrade head

echo "Перевіряю FastAPI app..."
python - <<'PY'
from voidtalk_api.main import app

routes = [
    route.path
    for route in app.routes
    if getattr(route, "path", "").startswith("/api")
]

print("API routes:")
for route in routes:
    print(f"  - {route}")
PY

cat <<'TEXT'

Готово.

Backend:
  source .venv/bin/activate
  uvicorn voidtalk_api.main:app --reload --host 127.0.0.1 --port 8000

Frontend:
  Відкрийте voidtalk_frontend через Live Server або інший статичний сервер.
  Якщо frontend на 127.0.0.1:5173, API за замовчуванням: http://127.0.0.1:8000
TEXT
