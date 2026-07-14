# Watcher externo en `jhulio`

`jhulio@167.234.255.122` se usa como watcher externo, no como nodo de datos ni como control-plane. El host ya tiene `sudo`, 2 vCPU y disco suficiente, pero solo cerca de 1 GiB de RAM; por eso su valor está en observar desde otra máquina sin cargar PostgreSQL, MongoDB o Kubernetes.

## Responsabilidad

- Verificar disponibilidad de `/health`.
- Verificar la API pública para Power BI sin conectar directo a bases de datos.
- Generar métricas Prometheus textfile para Node Exporter.
- Registrar latencia, código HTTP y estado.
- Enviar alerta por webhook o Telegram si se configura.
- Responder `/status` por Telegram con estado resumido del watcher.

## Instalación manual

```bash
sudo useradd --system --home /nonexistent --shell /usr/sbin/nologin fiq-watcher
sudo install -d -m 0755 /opt/fiq-watcher /etc/fiq-watcher /var/log/fiq-watcher /var/lib/fiq-watcher
sudo chown fiq-watcher:fiq-watcher /var/log/fiq-watcher /var/lib/fiq-watcher
sudo install -m 0755 watch_fiq_endpoints.sh /opt/fiq-watcher/watch_fiq_endpoints.sh
sudo install -m 0755 fiq_telegram_status_bot.py /opt/fiq-watcher/fiq_telegram_status_bot.py
sudo install -m 0640 watcher.env.example /etc/fiq-watcher/watcher.env
sudo chown root:fiq-watcher /etc/fiq-watcher/watcher.env
sudo install -m 0644 fiq-watcher.service /etc/systemd/system/fiq-watcher.service
sudo install -m 0644 fiq-watcher.timer /etc/systemd/system/fiq-watcher.timer
sudo install -m 0644 fiq-telegram-bot.service /etc/systemd/system/fiq-telegram-bot.service
sudo systemctl daemon-reload
sudo systemctl enable --now fiq-watcher.timer
sudo systemctl enable --now fiq-telegram-bot.service
```

Editar `/etc/fiq-watcher/watcher.env` en el servidor con los dominios reales, `DASHBOARD_API_KEY`, webhook si aplica y `TELEGRAM_BOT_TOKEN`. No versionar tokens reales.

Si `TELEGRAM_ALLOWED_CHAT_IDS` está vacío, el primer chat que envíe `/start` o `/status` al bot queda registrado en `/var/lib/fiq-watcher/telegram_chats`.

## Validación

```bash
sudo systemctl start fiq-watcher.service
systemctl status fiq-watcher.service --no-pager
systemctl status fiq-telegram-bot.service --no-pager
sudo tail -50 /var/log/fiq-watcher/watcher.log
sudo cat /var/lib/fiq-watcher/fiq-watcher.prom
```

En Telegram:

```text
/status
```

## Criterio operativo

Este watcher no reemplaza Prometheus/Grafana dentro del stack. Sirve como señal externa: si Cloudflare, tunnel, backend o la API Power BI fallan desde fuera, `jhulio` lo detecta aunque el cluster principal crea que todo está sano.
