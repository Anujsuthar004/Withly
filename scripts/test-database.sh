#!/usr/bin/env bash
set -euo pipefail

# Use PGHOST/PGPORT/PGUSER/PGDATABASE to target a dedicated, empty test DB.
# Refuse populated databases so this harness cannot rewrite an existing app.
if [[ "$(psql -X -At -v ON_ERROR_STOP=1 -c "select count(*) from pg_tables where schemaname in ('public', 'auth', 'storage')")" != "0" ]]; then
  echo "Database test harness requires an empty disposable database." >&2
  exit 1
fi
psql -X -v ON_ERROR_STOP=1 -f tests/database/bootstrap.sql
for migration in supabase/migrations/*.sql; do
  psql -X -v ON_ERROR_STOP=1 --single-transaction -f "$migration" >/dev/null
done
psql -X -v ON_ERROR_STOP=1 -f tests/database/security.sql
psql -X -v ON_ERROR_STOP=1 -f tests/database/session-safety.sql
