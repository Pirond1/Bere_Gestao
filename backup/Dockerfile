# Backup periódico (BG-23): mesma versão do MySQL do banco, para o mysqldump ser compatível
FROM mysql:8.0

# rclone: envia a cópia para fora do servidor (Google Drive etc.) — binário estático, só copiar
COPY --from=rclone/rclone:1.68.2 /usr/local/bin/rclone /usr/local/bin/rclone

COPY backup.sh /usr/local/bin/backup
COPY restaurar.sh /usr/local/bin/restaurar
RUN chmod +x /usr/local/bin/backup /usr/local/bin/restaurar

# Sem o entrypoint do MySQL: este container não sobe um servidor, só roda o agendador
ENTRYPOINT []
CMD ["backup"]
