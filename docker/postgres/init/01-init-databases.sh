#!/bin/sh
set -e

# ==============================================================================
# Script de Inicialização de Bancos Múltiplos para o Ecossistema SINPeP
# Executado automaticamente pelo entrypoint oficial do PostgreSQL no 1º boot.
# ==============================================================================

create_database() {
    db_name=$(echo "$1" | tr -d '[:space:]')
    if [ -z "$db_name" ]; then
        return
    fi

    echo "  -> [SINPeP-DB] Verificando existência da base '$db_name'..."
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
        SELECT 'CREATE DATABASE $db_name'
        WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db_name')\gexec
        GRANT ALL PRIVILEGES ON DATABASE $db_name TO $POSTGRES_USER;
EOSQL
    echo "  -> [SINPeP-DB] Base '$db_name' pronta e com privilégios concedidos."
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "[SINPeP-DB] Inicializando bases de dados adicionais: $POSTGRES_MULTIPLE_DATABASES"
    OLD_IFS="$IFS"
    IFS=','
    for db in $POSTGRES_MULTIPLE_DATABASES; do
        create_database "$db"
    done
    IFS="$OLD_IFS"
    echo "[SINPeP-DB] Todas as bases foram verificadas e criadas com sucesso!"
fi
