FROM python:3.13-alpine

RUN apk add --no-cache bash curl coreutils

WORKDIR /opt/fiq-watcher
COPY watch_fiq_endpoints.sh fiq_telegram_status_bot.py run_watcher_loop.sh run_telegram_bot.sh ./
RUN chmod 0755 /opt/fiq-watcher/*.sh /opt/fiq-watcher/fiq_telegram_status_bot.py \
  && mkdir -p /var/lib/fiq-watcher /var/log/fiq-watcher

ENV FIQ_WATCHER_CONFIG=/etc/fiq-watcher/watcher.env
CMD ["/opt/fiq-watcher/run_watcher_loop.sh"]
