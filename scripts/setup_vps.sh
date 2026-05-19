#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR="${VENV_DIR:-$ROOT_DIR/.venv}"
DATABASE_ENV_FILE="$ROOT_DIR/voidtalk_api/cfg/database_url.env"
RECOMMENDATIONS_ENV_FILE="$ROOT_DIR/voidtalk_api/cfg/recommendations.env"
FRONTEND_CONFIG_FILE="$ROOT_DIR/voidtalk_frontend/config.js"
DATABASE_URL_VALUE="${DATABASE_URL:-}"
API_BASE_URL_VALUE="${API_BASE_URL:-}"

usage() {
    cat <<'TEXT'
Usage:
  DATABASE_URL='postgresql+psycopg2://voidtalk:password@127.0.0.1:5432/voidtalk' ./scripts/setup_vps.sh
  ./scripts/setup_vps.sh

Optional environment variables:
  PYTHON_BIN     Python command to use. Default: python3
  VENV_DIR       Virtualenv directory. Default: .venv
  API_BASE_URL   Public backend base URL. Default: window.location.origin

If DATABASE_URL is not provided, the script tries to read it from
voidtalk_api/cfg/database_url.env.

Examples:
  DATABASE_URL='postgresql+psycopg2://voidtalk:secret@127.0.0.1:5432/voidtalk' ./scripts/setup_vps.sh
  DATABASE_URL='postgresql+psycopg2://voidtalk:secret@127.0.0.1:5432/voidtalk' API_BASE_URL='https://example.com' ./scripts/setup_vps.sh
TEXT
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
    usage
    exit 0
fi

if [ -z "$DATABASE_URL_VALUE" ] && [ -f "$DATABASE_ENV_FILE" ]; then
    DATABASE_URL_VALUE="$("$PYTHON_BIN" - "$DATABASE_ENV_FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
for line in path.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    key, value = line.split("=", 1)
    if key.strip() != "DATABASE_URL":
        continue
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
        value = value[1:-1]
    print(value.replace("\\'", "'").replace("\\\\", "\\"))
    break
PY
)"
fi

if [ -z "$DATABASE_URL_VALUE" ]; then
    echo "Error: DATABASE_URL is required." >&2
    echo >&2
    usage >&2
    exit 1
fi

echo "VoidTalk: preparing VPS deployment"

if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtualenv: $VENV_DIR"
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "Upgrading pip..."
python -m pip install --upgrade pip

TEMP_REQUIREMENTS="$(mktemp)"
cleanup() {
    rm -f "$TEMP_REQUIREMENTS"
}
trap cleanup EXIT

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
    raise SystemExit("Could not decode requirements.txt")

target.write_text(text, encoding="utf-8")
PY

echo "Installing Python dependencies..."
python -m pip install -r "$TEMP_REQUIREMENTS"

mkdir -p "$(dirname "$DATABASE_ENV_FILE")"
python - "$DATABASE_ENV_FILE" "$DATABASE_URL_VALUE" <<'PY'
from pathlib import Path
import sys

target = Path(sys.argv[1])
database_url = sys.argv[2]
escaped = database_url.replace("\\", "\\\\").replace('"', '\\"')
target.write_text(f'DATABASE_URL="{escaped}"\n', encoding="utf-8")
PY
chmod 600 "$DATABASE_ENV_FILE"
echo "Wrote $DATABASE_ENV_FILE"

if [ ! -f "$RECOMMENDATIONS_ENV_FILE" ]; then
    cat > "$RECOMMENDATIONS_ENV_FILE" <<'TEXT'
RECOMMENDATIONS_DEFAULT_LIMIT=20
RECOMMENDATIONS_MAX_LIMIT=100
RECOMMENDATIONS_CANDIDATE_POOL_MULTIPLIER=8

RECOMMENDATIONS_LIKED_HASHTAG_WEIGHT=3.0
RECOMMENDATIONS_AUTHORED_HASHTAG_WEIGHT=1.5
RECOMMENDATIONS_EXPLORATION_SCORE=0.2
RECOMMENDATIONS_NO_HASHTAG_SCORE=0.05

RECOMMENDATIONS_POPULARITY_PENALTY_POWER=1.2
RECOMMENDATIONS_FRESHNESS_HALF_LIFE_DAYS=21.0
RECOMMENDATIONS_MIN_FRESHNESS_SCORE=0.25
RECOMMENDATIONS_EXCLUDE_OWN_POSTS=true
TEXT
    echo "Created $RECOMMENDATIONS_ENV_FILE"
fi

if [ -n "$API_BASE_URL_VALUE" ]; then
    python - "$FRONTEND_CONFIG_FILE" "$API_BASE_URL_VALUE" <<'PY'
from pathlib import Path
import json
import sys

target = Path(sys.argv[1])
api_base_url = sys.argv[2].rstrip("/")
target.write_text(
    "window.VOIDTALK_CONFIG = {\n"
    f"    API_BASE_URL: {json.dumps(api_base_url)}\n"
    "};\n",
    encoding="utf-8",
)
PY
else
    cat > "$FRONTEND_CONFIG_FILE" <<'TEXT'
window.VOIDTALK_CONFIG = {
    API_BASE_URL: window.location.origin
};
TEXT
fi
echo "Wrote $FRONTEND_CONFIG_FILE"

echo "Running Alembic migrations..."
python -m alembic upgrade head

echo "Checking FastAPI import..."
python - <<'PY'
from voidtalk_api.main import app

print(f"Loaded {app.title}")
PY

cat <<'TEXT'

Done.

Next steps:
  1. Restart the systemd service.
  2. Reload Nginx.
  3. Open the site and check /docs through the public domain if enabled.
TEXT
