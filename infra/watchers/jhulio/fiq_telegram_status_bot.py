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


def metric_lines() -> list[str]:
    if not METRICS_FILE.exists():
        return ["metrics: not available"]

    status: dict[str, dict[str, str]] = {}
    for line in METRICS_FILE.read_text(encoding="utf-8").splitlines():
        if "{target=\"" not in line:
            continue
        prefix, value = line.rsplit(" ", 1)
        target = prefix.split('{target="', 1)[1].split('"', 1)[0]
        metric = prefix.split("{", 1)[0].replace("fiq_watcher_", "")
        status.setdefault(target, {})[metric] = value

    if not status:
        return ["metrics: empty"]

    lines: list[str] = []
    for target in sorted(status):
        data = status[target]
        up = data.get("up", "0")
        state = "UP" if up == "1" else "DOWN"
        detail = data.get("http_status") or data.get("tcp_status") or "n/a"
        latency = data.get("latency_seconds", "n/a")
        lines.append(f"{target}: {state} status={detail} latency={latency}s")
    return lines


def last_log_lines() -> list[str]:
    if not LOG_FILE.exists():
        return []
    lines = [line for line in LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines() if line]
    return lines[-3:]


def status_text() -> str:
    lines = [
        "FIQ status",
        f"watcher.timer={systemctl_state('fiq-watcher.timer')}",
        f"watcher.service={systemctl_state('fiq-watcher.service')}",
        "",
        "Targets:",
        *metric_lines(),
    ]
    logs = last_log_lines()
    if logs:
        lines.extend(["", "Recent logs:", *logs])
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
