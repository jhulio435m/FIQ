# Imagen para los CronJobs de backup y verificación de restore.
FROM postgres:17-alpine

RUN apk add --no-cache bash coreutils findutils mongodb-tools \
    && addgroup -S -g 10001 fiq && adduser -S -u 10001 -G fiq -h /backups fiq

COPY deploy_scripts/backup_datastores.sh /usr/local/bin/backup_datastores.sh
COPY deploy_scripts/restore_verify.sh /usr/local/bin/restore_verify.sh
RUN chmod 0755 /usr/local/bin/backup_datastores.sh /usr/local/bin/restore_verify.sh

USER fiq
ENTRYPOINT []
CMD ["bash", "/usr/local/bin/backup_datastores.sh"]
