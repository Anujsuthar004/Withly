// Explicitly opt-in operational tool. Never prints temporary credentials.
import { spawnSync } from "node:child_process";
import { readFile, writeFile, mkdtemp, mkdir, rm, stat } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { encryptBackup, decryptBackup } from "./backup-crypto.mjs";

if (process.env.WITHLY_ALLOW_PRODUCTION_BACKUP !== "yes") throw Error("Set WITHLY_ALLOW_PRODUCTION_BACKUP=yes for the intended project.");
const project = process.env.WITHLY_BACKUP_PROJECT_REF;
const directory = process.env.WITHLY_BACKUP_DIR;
const keyFile = process.env.WITHLY_BACKUP_KEY_FILE;
const tokenFile = process.env.WITHLY_SUPABASE_ACCESS_TOKEN_FILE;
const cli = process.env.WITHLY_SUPABASE_BIN || "supabase";
const root = fileURLToPath(new URL("../", import.meta.url));
if (!/^[a-z]{20}$/.test(project || "")) throw Error("Set the expected WITHLY_BACKUP_PROJECT_REF.");
for (const p of [directory, keyFile, tokenFile]) if (!p || !path.isAbsolute(p)) throw Error("Use absolute paths for backup directory, key and access-token file.");
if ((await stat(keyFile)).mode & 0o077) throw Error("Backup key permissions must be 0600.");
const token = (await readFile(tokenFile, "utf8")).trim();
const key = await readFile(keyFile);
const temporary = await mkdtemp(path.join(tmpdir(), "withly-production-backup-"));
await mkdir(directory, { recursive: true, mode: 0o700 });
const tag = new Date().toISOString().replaceAll(":", "-");
const escapePass = (value) => value.replaceAll("\\", "\\\\").replaceAll(":", "\\:");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", timeout: 120_000, maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.status !== 0 || result.error) throw Error(`${path.basename(command)} failed; sensitive subprocess output suppressed.`);
  return result.stdout;
}
async function api(endpoint) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${project}/${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw Error(`Supabase management request failed (${response.status}).`);
  return response.json();
}
try {
  const output = run(cli, ["db", "dump", "--linked", "--dry-run"], {
    cwd: process.env.WITHLY_SUPABASE_WORKDIR || root,
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: token },
  });
  const values = Object.fromEntries(["PGHOST", "PGPORT", "PGDATABASE", "PGUSER", "PGPASSWORD"].map((name) =>
    [name, output.match(new RegExp(`export ${name}="([^"\\r\\n]+)"`))?.[1]]));
  if (Object.values(values).some((v) => !v) || !(values.PGUSER.endsWith(`.${project}`) || values.PGHOST === `db.${project}.supabase.co`)) throw Error("Temporary database connection does not match expected project.");
  const pgpass = path.join(temporary, "pgpass");
  await writeFile(pgpass, [values.PGHOST, values.PGPORT, values.PGDATABASE, values.PGUSER, values.PGPASSWORD].map(escapePass).join(":") + "\n", { mode: 0o600, flag: "wx" });
  const env = { ...process.env, ...values, PGPASSFILE: pgpass, PG_ROLE: "postgres", PGSSLMODE: "verify-full", PGSSLROOTCERT: process.env.PGSSLROOTCERT || "system", PGCONNECT_TIMEOUT: "15" };
  delete env.PGPASSWORD;
  console.log("Creating database archive with verified TLS and temporary credentials...");
  const databaseOutput = run(process.execPath, [path.join(root, "scripts/backup-database.mjs"), "backup"], { env, timeout: 300_000 });
  console.log(databaseOutput.trim());

  const keys = await api("api-keys?reveal=true");
  const service = keys.find((item) => item.type === "secret" || item.name === "service_role")?.api_key;
  if (!service) throw Error("Storage backup credential unavailable.");
  const admin = createClient(`https://${project}.supabase.co`, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const buckets = await admin.storage.listBuckets();
  if (buckets.error) throw Error("Could not list Storage buckets.");
  const storageDir = path.join(temporary, "storage");
  await mkdir(storageDir, { mode: 0o700 });
  const objects = [];
  for (const bucket of buckets.data) {
    const client = admin.storage.from(bucket.id);
    const visit = async (prefix = "") => {
      for (let offset = 0; ; offset += 100) {
        const page = await client.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
        if (page.error) throw Error("Storage listing failed.");
        for (const entry of page.data) {
          const name = prefix ? `${prefix}/${entry.name}` : entry.name;
          if (!entry.id) { await visit(name); continue; }
          const blob = await client.download(name);
          if (blob.error) throw Error("Storage download failed.");
          const bytes = Buffer.from(await blob.data.arrayBuffer());
          const local = `object-${objects.length}`;
          await writeFile(path.join(storageDir, local), bytes, { mode: 0o600, flag: "wx" });
          objects.push({ bucket: bucket.id, path: name, file: local, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
        }
        if (page.data.length < 100) break;
      }
    };
    await visit();
  }
  await writeFile(path.join(storageDir, "manifest.json"), JSON.stringify({ project, createdAt: tag, buckets: buckets.data, objects }), { mode: 0o600, flag: "wx" });
  const tar = path.join(temporary, "storage.tar");
  run("tar", ["-cf", tar, "-C", storageDir, "."]);
  const encrypted = path.join(directory, `withly-storage-${tag}.tar.enc`);
  await encryptBackup(createReadStream(tar), encrypted, key);
  const checked = path.join(temporary, "checked.tar");
  await decryptBackup(encrypted, checked, key);
  if (createHash("sha256").update(await readFile(checked)).digest("hex") !== createHash("sha256").update(await readFile(tar)).digest("hex")) throw Error("Storage archive verification failed.");
  console.log(`Storage archive authenticated: ${encrypted}; ${objects.length} objects. Off-site upload and restore drill are separate steps.`);
} finally {
  key.fill(0);
  await rm(temporary, { recursive: true, force: true });
}
