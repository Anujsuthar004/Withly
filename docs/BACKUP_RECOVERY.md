# Encrypted backup and recovery

## Current launch requirement

The Supabase backup API listed no available backups on September 30, 2026, and PITR was disabled. Do not assume a recovery point exists. The owner selected free encrypted backups rather than a paid upgrade.

The supplied script creates an AES-256-GCM encrypted PostgreSQL custom archive, preserving schema/table grants as well as RLS. Every successful run authenticates/decrypts the ciphertext and checks its PostgreSQL archive catalog. This is **not** a restore drill. Database dumps contain Storage metadata, **not uploaded file bytes**; back up avatar objects separately. An on-device archive alone is not an off-site backup.

## One-time local setup

Use Node 24 and a `pg_dump`/`pg_restore` version compatible with the hosted PostgreSQL major version. Keep everything below outside the repository. The script refuses repository-local keys/archives and never overwrites an existing key.

```sh
export WITHLY_BACKUP_KEY_FILE=/Users/anujsuthar/.config/withly-backup/encryption.key
export WITHLY_BACKUP_DIR=/Users/anujsuthar/.local/share/withly-backups
node scripts/backup-database.mjs init-key
```

Make a secure recovery copy of the encryption key in a password manager or separate offline medium. Do not upload it alongside the encrypted backups. Losing the key makes the backups unrecoverable.

In Supabase's **Connect** dialog, choose the session pooler (not transaction pooling). Copy only its host, port, database and username into your local environment. Use the database password, not an API/service-role key. Enter that password locally in a private `PGPASSFILE`; never paste it into chat, command arguments or Git. The file format is `host:port:database:username:password`; escape colons and backslashes in values per PostgreSQL's password-file rules. Set its permissions to `0600`.

```sh
export PGHOST=HOST_FROM_SUPABASE_CONNECT
export PGPORT=5432
export PGDATABASE=postgres
export PGUSER=USERNAME_FROM_SUPABASE_CONNECT
export PGPASSFILE=/Users/anujsuthar/.config/withly-backup/pgpass
export PGSSLMODE=verify-full
export PGSSLROOTCERT=system
node scripts/backup-database.mjs backup
```

TLS certificate verification is enabled by default. Do not disable it for production to work around a connection error. A missing key, loose credential-file permissions, database connection failure, encryption failure or invalid archive makes the command fail.

## Storage and cadence

On October 1, 2026, the owner selected Google Drive. A folder named **Withly Encrypted Backups** was created in the owner's My Drive; its sharing dialog shows **Restricted**, with only the owner listed. It is currently empty. The encryption key must not be stored in that folder. Folder creation alone does not configure uploads, scheduling, or a production recovery point.

After each successful run, copy the `.dump.enc` file to an owner-approved off-device destination (for example a private cloud folder or external drive). Keep a daily backup and one before migrations/releases; retain at least seven daily and four weekly recovery points. No destination, scheduled task, paid plan, retention deletion or cloud upload is automatically configured by this script.

Back up Supabase Storage object bytes separately, preserving bucket and object paths. Until both the database and Storage recovery paths have been tested, recovery remains a release gate.

## Verification and restore drill

```sh
node scripts/backup-database.mjs verify /absolute/path/to/withly-TIMESTAMP.dump.enc
```

The verify command removes its temporary plaintext archive afterward. Run a full restore into a **new isolated database/project**, never production. Follow Supabase's backup/restore instructions for platform-managed schemas, roles, Auth, extensions and Storage. Referenced roles must exist; do not discard ACLs during restoration or authenticated members can lose schema/table access. Compare table counts, verify migrations and RLS, restore Storage files, and test sign-in, feed and private chat. Record the archive timestamp and drill outcome without logging user records, passwords, tokens or reset links.

References: [Supabase backup and restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [PostgreSQL password files](https://www.postgresql.org/docs/current/libpq-pgpass.html).
