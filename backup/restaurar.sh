#!/bin/bash
# Restaura um backup do Berê Gestão (BG-23): substitui TODO o banco e as fotos dos produtos.
#
# Uso (dentro do container):
#   restaurar diarios/bere_2026-10-14_0300.tar.gz
#   restaurar /caminho/qualquer/bere_....tar.gz --sim   # sem pedir confirmação
#
# Para restaurar um arquivo baixado do Drive, coloque-o em backups/ e passe o nome.
set -euo pipefail

arquivo="${1:-}"
if [[ -z "$arquivo" ]]; then
    echo "Uso: restaurar <arquivo.tar.gz> [--sim]"
    echo "Backups disponíveis:"
    (cd /backups && ls -1t diarios/*.tar.gz semanais/*.tar.gz 2>/dev/null) || echo "  (nenhum)"
    exit 1
fi
[[ "$arquivo" == /* ]] || arquivo="/backups/$arquivo"
[[ -f "$arquivo" ]] || { echo "Arquivo não encontrado: $arquivo"; exit 1; }

if [[ "${2:-}" != "--sim" ]]; then
    echo "ATENÇÃO: o banco '$MYSQL_DATABASE' e as fotos dos produtos serão SUBSTITUÍDOS pelo conteúdo de:"
    echo "  $arquivo"
    echo "Tudo o que foi feito depois desse backup será perdido."
    read -rp "Digite RESTAURAR para confirmar: " resposta
    [[ "$resposta" == "RESTAURAR" ]] || { echo "Cancelado."; exit 1; }
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
tar -xzf "$arquivo" -C "$tmp"
[[ -f "$tmp/banco.sql" ]] || { echo "Arquivo inválido: não contém banco.sql"; exit 1; }

export MYSQL_PWD="$MYSQL_PASSWORD"
conexao=(-h "${MYSQL_HOST:-db}" -u "$MYSQL_USER")

echo "Restaurando o banco..."
# Recria o banco do zero: tabelas criadas depois do backup também somem
mysql "${conexao[@]}" -e "DROP DATABASE IF EXISTS \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\`;"
mysql "${conexao[@]}" --default-character-set=utf8mb4 "$MYSQL_DATABASE" < "$tmp/banco.sql"

echo "Restaurando as fotos..."
mkdir -p /dados/uploads
find /dados/uploads -mindepth 1 -delete
cp -a "$tmp/uploads/." /dados/uploads/

echo "Pronto. Banco e fotos restaurados de $(basename "$arquivo")."