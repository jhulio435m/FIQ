#!/usr/bin/env bash
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PROJECT_ROOT="$(dirname -- "$SCRIPT_DIR")"
CBM_EXECUTABLE="${CODEBASE_MEMORY_BIN:-$HOME/.local/bin/codebase-memory-mcp}"
CODEBASE_CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/codebase-memory-mcp-fiq"
CODEBASE_MAP_PORT="${CODEBASE_MAP_PORT:-9749}"

export CBM_ALLOWED_ROOT="$PROJECT_ROOT"
export CBM_CACHE_DIR="$CODEBASE_CACHE_DIR"
export CBM_MEM_BUDGET_MB="${CBM_MEM_BUDGET_MB:-2048}"

if [ ! -x "$CBM_EXECUTABLE" ]; then
  echo "No se encontro codebase-memory-mcp en: $CBM_EXECUTABLE" >&2
  exit 1
fi

case "${1:-ui}" in
  index)
    exec "$CBM_EXECUTABLE" cli --progress index_repository \
      --repo-path "$PROJECT_ROOT" \
      --name fiq \
      --mode full \
      --persistence false
    ;;
  status)
    exec "$CBM_EXECUTABLE" cli index_status --project fiq
    ;;
  architecture)
    exec "$CBM_EXECUTABLE" cli get_architecture \
      --project fiq \
      --aspects overview
    ;;
  ui)
    echo "Mapa FIQ: http://127.0.0.1:$CODEBASE_MAP_PORT"
    echo "Detenlo con Ctrl+C."
    exec "$CBM_EXECUTABLE" --ui=true --port="$CODEBASE_MAP_PORT"
    ;;
  *)
    echo "Uso: $0 {index|ui|status|architecture}" >&2
    exit 2
    ;;
esac
