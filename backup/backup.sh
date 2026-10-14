#!/bin/bash
# Backup periódico do Berê Gestão (BG-23) — ERS, seção 2.1 Operações.
#
# Cada backup é um único .tar.gz com o banco (banco.sql) e as fotos dos produtos (uploads/).
# Retenção local: últimos BACKUP_DIAS diários + BACKUP_SEMANAS semanais (o de domingo).
# Com BACKUP_REMOTO preenchido, envia uma cópia para fora do servidor via rclone.
#
# Uso:
#   backup        agenda: roda todo dia no BACKUP_HORARIO (horário de Brasília)
#   backup agora  faz um backup na hora e sai
set -uo pipefail

DESTINO=/backups
UPLOADS=/dados/uploads
HORARIO="${BACKUP_HORARIO:-03:00}"
DIAS="${BACKUP_DIAS:-7}"
SEMANAS="${BACKUP_SEMANAS:-4}"
# Remote do rclone + pasta, ex.: drive:bere-backups. Vazio = só cópia local
REMOTO="${BACKUP_REMOTO:-}"

# Lidos pela API para o card "Último backup" do painel
STATUS_OK="$DESTINO/ultimo_backup.json"
STATUS_FALHA="$DESTINO/ultima_falha.json"

log() { echo "[backup $(date '+%d/%m/%Y %H:%M:%S')] $*"; }
agora_utc() { date -u +%Y-%m-%dT%H:%M:%SZ; }

# Grava em arquivo temporário e renomeia: a API nunca lê um JSON pela metade
gravar_json() {
    printf '%s\n' "$2" > "$1.tmp" && mv "$1.tmp" "$1"
}

registrar_falha() {
    log "FALHA: $1"
    gravar_json "$STATUS_FALHA" "{\"data_hora\": \"$(agora_utc)\", \"erro\": \"$1\"}"
}

# Apaga os mais antigos, mantendo os N mais recentes da pasta
manter_ultimos() {
    find "$1" -maxdepth 1 -name 'bere_*.tar.gz' -printf '%T@ %p\n' \
        | sort -rn | tail -n +"$(($2 + 1))" | cut -d' ' -f2- | xargs -r rm -f --
}

# Pasta dentro do remoto: "drive:bere-backups" → "drive:bere-backups/diarios"; "drive-cripto:" → "drive-cripto:diarios"
pasta_remota() {
    if [[ "$REMOTO" == *: ]]; then echo "$REMOTO$1"; else echo "$REMOTO/$1"; fi
}

# Envia o arquivo e apaga do remoto o que já passou da retenção. Devolve "enviada" ou "falhou"
copiar_para_remoto() {
    local arquivo="$1" semanal="$2"
    rclone copy "$arquivo" "$(pasta_remota diarios)" >&2 || { echo falhou; return; }
    if [[ "$semanal" == 1 ]]; then
        rclone copy "$arquivo" "$(pasta_remota semanais)" >&2 || { echo falhou; return; }
    fi
    # Retenção por idade no remoto — nunca "sync": se o disco local sumir, o remoto não pode ser apagado junto
    # Silencioso: falha aqui não perde backup (ex.: pasta "semanais" ainda não existe até o 1º domingo)
    rclone delete "$(pasta_remota diarios)" --min-age "$((DIAS + 1))d" --retries 1 2>/dev/null || true
    rclone delete "$(pasta_remota semanais)" --min-age "$((SEMANAS * 7 + 1))d" --retries 1 2>/dev/null || true
    echo enviada
}

fazer_backup() {
    local nome tmp arquivo semanal copia
    nome="bere_$(date +%Y-%m-%d_%H%M).tar.gz"
    mkdir -p "$DESTINO/diarios" "$DESTINO/semanais"
    tmp=$(mktemp -d)
    log "Iniciando $nome"

    # --single-transaction: cópia consistente sem travar os pedidos em andamento
    # --no-tablespaces: o usuário da aplicação não tem o privilégio PROCESS
    if ! MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -h "${MYSQL_HOST:-db}" -u "$MYSQL_USER" \
        --single-transaction --no-tablespaces --set-gtid-purged=OFF \
        --default-character-set=utf8mb4 "$MYSQL_DATABASE" > "$tmp/banco.sql"; then
        rm -rf "$tmp"
        registrar_falha "Não foi possível exportar o banco de dados"
        return 1
    fi

    mkdir -p "$tmp/uploads"
    [[ -d "$UPLOADS" ]] && cp -a "$UPLOADS/." "$tmp/uploads/"

    # .parte até terminar: um arquivo pela metade nunca aparece como backup válido
    arquivo="$DESTINO/diarios/$nome"
    if ! tar -czf "$arquivo.parte" -C "$tmp" banco.sql uploads || ! mv "$arquivo.parte" "$arquivo"; then
        rm -rf "$tmp" "$arquivo.parte"
        registrar_falha "Não foi possível gravar o arquivo de backup"
        return 1
    fi
    rm -rf "$tmp"

    semanal=0
    if [[ "$(date +%u)" == 7 ]]; then
        semanal=1
        cp "$arquivo" "$DESTINO/semanais/$nome"
    fi
    manter_ultimos "$DESTINO/diarios" "$DIAS"
    manter_ultimos "$DESTINO/semanais" "$SEMANAS"

    copia=desativada
    if [[ -n "$REMOTO" ]]; then
        copia=$(copiar_para_remoto "$arquivo" "$semanal")
        log "Cópia externa ($REMOTO): $copia"
    fi

    gravar_json "$STATUS_OK" "{\"data_hora\": \"$(agora_utc)\", \"arquivo\": \"diarios/$nome\", \"tamanho_bytes\": $(stat -c %s "$arquivo"), \"copia_externa\": \"$copia\"}"
    rm -f "$STATUS_FALHA"
    log "Concluído: $arquivo ($(du -h "$arquivo" | cut -f1))"
}

# Segundos até o próximo BACKUP_HORARIO (hoje, se ainda não passou; senão amanhã)
segundos_ate_proximo() {
    local alvo agora
    agora=$(date +%s)
    alvo=$(date -d "today $HORARIO" +%s)
    (( alvo <= agora )) && alvo=$(date -d "tomorrow $HORARIO" +%s)
    echo $((alvo - agora))
}

if [[ "${1:-}" == "agora" ]]; then
    fazer_backup
    exit $?
fi

# Primeira vez no servidor: não espera a madrugada para ter um backup
[[ -f "$STATUS_OK" ]] || fazer_backup

while true; do
    espera=$(segundos_ate_proximo)
    log "Próximo backup em $(date -d "@$(( $(date +%s) + espera ))" '+%d/%m/%Y às %H:%M')"
    sleep "$espera"
    fazer_backup
done
