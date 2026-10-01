import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, realpath, stat, unlink, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encryptBackup, decryptBackup } from "./backup-crypto.mjs";

const mode = process.argv[2];
const keyFile = process.env.WITHLY_BACKUP_KEY_FILE;
const repository = await realpath(fileURLToPath(new URL("../", import.meta.url)));
async function requireExternalDirectory(directory) {
  const relative = path.relative(repository, await realpath(directory));
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("Backup keys and archives must be outside the repository.");
  }
}
if (!keyFile || !path.isAbsolute(keyFile)) throw new Error("Set WITHLY_BACKUP_KEY_FILE to an absolute path outside the repository.");
if (mode === "init-key") {
  await mkdir(path.dirname(keyFile), { recursive: true, mode: 0o700 });
  await requireExternalDirectory(path.dirname(keyFile));
  await writeFile(keyFile, randomBytes(32), { flag: "wx", mode: 0o600 });
  console.log("Encryption key created. Keep a separate, secure recovery copy; losing it loses all backups.");
} else {
  await requireExternalDirectory(path.dirname(await realpath(keyFile)));
  if ((await stat(keyFile)).mode & 0o077) throw new Error("Encryption key permissions must be 0600.");
  const key = await readFile(keyFile);
  if (!["backup", "verify"].includes(mode)) throw new Error("Usage: backup-database.mjs init-key|backup|verify [archive]");
  let archive = process.argv[3];
  if (mode === "backup") {
    const directory = process.env.WITHLY_BACKUP_DIR;
    if (!directory || !path.isAbsolute(directory)) throw new Error("Set an absolute WITHLY_BACKUP_DIR outside Git.");
    if (!process.env.PGHOST || !process.env.PGUSER || !process.env.PGDATABASE) throw new Error("Set PGHOST, PGUSER and PGDATABASE; use PGPASSFILE for the password.");
    if (!process.env.PGPASSFILE || !path.isAbsolute(process.env.PGPASSFILE)) throw new Error("Set an absolute PGPASSFILE; do not put database passwords in command arguments.");
    if ((await stat(process.env.PGPASSFILE)).mode & 0o077) throw new Error("PGPASSFILE permissions must be 0600.");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await requireExternalDirectory(directory);
    archive = path.join(directory, `withly-${new Date().toISOString().replaceAll(":", "-")}-${randomBytes(4).toString("hex")}.dump.enc`);
    // Preserve ACLs: RLS alone is insufficient if schema/table grants are lost.
    const dump = spawn(process.env.PG_DUMP_BIN || "pg_dump", ["--format=custom", "--no-owner", "--no-password"], {
      env: { ...process.env, PGSSLMODE: process.env.PGSSLMODE || "verify-full", PGSSLROOTCERT: process.env.PGSSLROOTCERT || "system" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    dump.stderr.resume(); // Do not accidentally log connection details.
    const completion = new Promise((resolve, reject) => {
      dump.once("error", reject);
      dump.once("close", (code) => code === 0 ? resolve() : reject(new Error(`pg_dump failed (exit ${code}); check connection, credentials and server/client versions.`)));
    });
    const jobs = [encryptBackup(dump.stdout, archive, key), completion];
    try { await Promise.all(jobs); }
    catch (error) {
      dump.kill();
      await Promise.allSettled(jobs);
      await unlink(archive).catch(() => {});
      throw error;
    }
  }
  if (!archive || !path.isAbsolute(archive)) throw new Error("Provide an absolute encrypted archive path.");
  const temporary = await mkdtemp(path.join(tmpdir(), "withly-backup-verify-"));
  const plaintext = path.join(temporary, "database.dump");
  try {
    await decryptBackup(archive, plaintext, key);
    await new Promise((resolve, reject) => {
      const restore = spawn(process.env.PG_RESTORE_BIN || "pg_restore", ["--list", plaintext], { stdio: "ignore" });
      restore.once("error", reject);
      restore.once("close", (code) => code === 0 ? resolve() : reject(new Error("Archive catalog verification failed.")));
    });
    console.log(`Authenticated encryption and PostgreSQL archive catalog verified: ${archive}`);
    console.log("This is NOT a restore drill. Storage file bytes are NOT included. Copy the encrypted archive off-device and test restore into an isolated database.");
  } finally {
    key.fill(0);
    await unlink(plaintext).catch(() => {});
    await rmdir(temporary).catch(() => {});
  }
}
