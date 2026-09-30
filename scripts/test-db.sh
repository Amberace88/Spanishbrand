#!/usr/bin/env bash
# Runs migrations + seed + rule tests against a throwaway local Postgres.
# Usage: PGHOST=/var/run/postgresql PGPORT=5432 PGUSER=postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
P="psql -v ON_ERROR_STOP=1 -q"
$P -c "drop database if exists brand_os_test" -c "create database brand_os_test"
$P -d brand_os_test -f scripts/test-db-shim.sql
for f in supabase/migrations/*.sql supabase/seed.sql; do $P -d brand_os_test -f "$f"; done
$P -d brand_os_test -f scripts/test-db-rules.sql
echo "DB tests passed"
