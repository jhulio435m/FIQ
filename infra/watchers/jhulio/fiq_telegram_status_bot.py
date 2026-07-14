#!/usr/bin/env python3
"""Small Telegram long-polling bot for the FIQ external watcher."""

from __future__ import annotations

import json
import os
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


CONFIG_FILE = Path(os.environ.get("FIQ_WATCHER_CONFIG", "/etc/fiq-watcher/watcher.env"))


def load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


ENV = {**load_env_file(CONFIG_FILE), **os.environ}
TOKEN = ENV.get("TELEGRAM_BOT_TOKEN", "")
STATE_DIR = Path(ENV.get("FIQ_WATCHER_STATE_DIR", "/var/lib/fiq-watcher"))
CHATS_FILE = Path(ENV.get("TELEGRAM_CHATS_FILE", str(STATE_DIR / "telegram_chats")))
OFFSET_FILE = Path(ENV.get("TELEGRAM_OFFSET_FILE", str(STATE_DIR / "telegram_offset")))
METRICS_FILE = Path(ENV.get("FIQ_WATCHER_METRICS_FILE", "/tmp/fiq-watcher.prom"))
LOG_FILE = Path(ENV.get("FIQ_WATCHER_LOG_FILE", "/tmp/fiq-watcher.log"))
HA_STATUS_FILE = Path(ENV.get("FIQ_HA_STATUS_FILE", str(STATE_DIR / "ha_status.json")))
ALLOWED_CHAT_IDS = {
    chat_id.strip()
    for chat_id in ENV.get("TELEGRAM_ALLOWED_CHAT_IDS", ENV.get("TELEGRAM_CHAT_ID", "")).split()
    if chat_id.strip()
}


def api(method: str, payload: dict[str, object] | None = None) -> dict[str, object]:
    if not TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
    data = urllib.parse.urlencode(payload or {}).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{TOKEN}/{method}",
        data=data,
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=35) as response:
        return json.loads(response.read().decode("utf-8"))


def registered_chat_ids() -> set[str]:
    if not CHATS_FILE.exists():
        return set()
    return {
        line.strip()
        for line in CHATS_FILE.read_text(encoding="utf-8").splitlines()
        if line.strip()
    }


def save_chat_id(chat_id: str) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    chat_ids = registered_chat_ids()
    if chat_id not in chat_ids:
        with CHATS_FILE.open("a", encoding="utf-8") as file:
            file.write(f"{chat_id}\n")


def chat_is_allowed(chat_id: str) -> bool:
    if chat_id in ALLOWED_CHAT_IDS or chat_id in registered_chat_ids():
        return True
    if not ALLOWED_CHAT_IDS and not registered_chat_ids():
        save_chat_id(chat_id)
        return True
    return False


def read_offset() -> int | None:
    if not OFFSET_FILE.exists():
        return None
    try:
        return int(OFFSET_FILE.read_text(encoding="utf-8").strip())
    except ValueError:
        return None


def write_offset(offset: int) -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    OFFSET_FILE.write_text(str(offset), encoding="utf-8")


def systemctl_state(unit: str) -> str:
    try:
        result = subprocess.run(
            ["systemctl", "is-active", unit],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
    except Exception:
        return "unknown"
    return result.stdout.strip() or "unknown"


def service_label(name: str) -> str:
    labels = {
        "frontend": "Frontend publico",
        "grafana": "Grafana",
        "azure_ssh": "Azure SSH",
        "api_health": "API backend",
        "powerbi_dashboard": "API Power BI",
    }
    return labels.get(name, name.replace("_", " ").strip().title())


def format_latency(value: str) -> str:
    try:
        seconds = float(value)
    except ValueError:
        return value
    if seconds < 1:
        return f"{round(seconds * 1000)} ms"
    return f"{seconds:.1f} s"


def read_metrics() -> dict[str, dict[str, str]]:
    if not METRICS_FILE.exists():
        return {}

    status: dict[str, dict[str, str]] = {}
    for line in METRICS_FILE.read_text(encoding="utf-8").splitlines():
        if "{target=\"" not in line:
            continue
        prefix, value = line.rsplit(" ", 1)
        target = prefix.split('{target="', 1)[1].split('"', 1)[0]
        metric = prefix.split("{", 1)[0].replace("fiq_watcher_", "")
        status.setdefault(target, {})[metric] = value

    return status


def metric_lines(status: dict[str, dict[str, str]]) -> list[str]:
    if not status:
        return ["- Sin metricas disponibles"]
    lines: list[str] = []
    for target in sorted(status):
        data = status[target]
        up = data.get("up", "0")
        state = "OK" if up == "1" else "DOWN"
        latency = format_latency(data.get("latency_seconds", "n/a"))
        if "http_status" in data:
            detail = f"HTTP {data['http_status']}"
        elif "tcp_status" in data:
            detail = "TCP conectado" if data["tcp_status"] == "1" else "TCP sin conexion"
        else:
            detail = "sin detalle"
        lines.append(f"- {service_label(target)}: {state} ({detail}, {latency})")
    return lines


def health_summary(status: dict[str, dict[str, str]]) -> str:
    if not status:
        return "SIN METRICAS"
    failed = [target for target, data in status.items() if data.get("up") != "1"]
    if failed:
        return "ALERTA: " + ", ".join(service_label(target) for target in sorted(failed))
    return "OK"


def ha_status() -> dict[str, str]:
    defaults = {
        "app": ENV.get(
            "FIQ_HA_APP_STATUS",
            "OK - 3 replicas distribuidas en oti, ubuntu y laptop",
        ),
        "control_plane": ENV.get(
            "FIQ_HA_CONTROL_PLANE_STATUS",
            "NO REQUERIDO - oti como control-plane es suficiente para este laboratorio",
        ),
        "postgres": ENV.get(
            "FIQ_HA_POSTGRES_STATUS",
            "PENDIENTE CRITICO - falta Patroni/etcd/HAProxy o PostgreSQL gestionado",
        ),
    }
    if not HA_STATUS_FILE.exists():
        return defaults
    try:
        file_status = json.loads(HA_STATUS_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return defaults
    for key in defaults:
        value = file_status.get(key)
        if isinstance(value, str) and value.strip():
            defaults[key] = value.strip()
    return defaults


def service_state_line(label: str, unit: str, inactive_is_ok: bool = False) -> str:
    state = systemctl_state(unit)
    if state == "active" or (inactive_is_ok and state == "inactive"):
        rendered = "OK"
    else:
        rendered = f"ALERTA ({state})"
    return f"- {label}: {rendered}"


def status_text() -> str:
    metrics = read_metrics()
    ha = ha_status()
    lines = [
        "FIQ - Estado general",
        f"Resumen: {health_summary(metrics)}",
        f"Revision: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}",
        "",
        "Servicios:",
        service_state_line("Watcher programado", "fiq-watcher.timer"),
        service_state_line("Ultimo chequeo", "fiq-watcher.service", inactive_is_ok=True),
        service_state_line("Bot Telegram", "fiq-telegram-bot.service"),
        "",
        "Objetivos monitoreados:",
        *metric_lines(metrics),
        "",
        "Alta disponibilidad:",
        f"- App/frontend: {ha['app']}",
        f"- Control-plane: {ha['control_plane']}",
        f"- PostgreSQL HA: {ha['postgres']}",
    ]
    return "\n".join(lines)[:3900]


def send_message(chat_id: str, text: str) -> None:
    api("sendMessage", {"chat_id": chat_id, "text": text})


def handle_message(message: dict[str, object]) -> None:
    chat = message.get("chat")
    if not isinstance(chat, dict):
        return
    chat_id = str(chat.get("id", ""))
    text = str(message.get("text", "")).strip()
    if not chat_id or not text.startswith("/"):
        return

    if not chat_is_allowed(chat_id):
        send_message(chat_id, "FIQ watcher: chat not authorized.")
        return

    command = text.split()[0].split("@", 1)[0].lower()
    if command in {"/start", "/status"}:
        save_chat_id(chat_id)
        send_message(chat_id, status_text())
    else:
        send_message(chat_id, "Available commands: /status")


def main() -> int:
    if not TOKEN:
        raise SystemExit("TELEGRAM_BOT_TOKEN is required")

    while True:
        offset = read_offset()
        payload: dict[str, object] = {"timeout": 30}
        if offset is not None:
            payload["offset"] = offset
        try:
            response = api("getUpdates", payload)
            for update in response.get("result", []):
                if not isinstance(update, dict):
                    continue
                update_id = int(update["update_id"])
                write_offset(update_id + 1)
                message = update.get("message")
                if isinstance(message, dict):
                    handle_message(message)
        except (urllib.error.URLError, TimeoutError, RuntimeError) as exc:
            print(f"telegram bot polling error: {exc}", flush=True)
            time.sleep(10)


if __name__ == "__main__":
    raise SystemExit(main())
