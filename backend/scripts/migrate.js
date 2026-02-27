const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

let Pool = null;
try {
  ({ Pool } = require("pg"));
} catch {
  Pool = null;
}

const SQL_DIR = path.resolve(__dirname, "..", "sql");
const ROOT_DIR = path.resolve(__dirname, "..", "..");

function parseEnvLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separator = trimmed.indexOf("=");
  if (separator <= 0) {
    return null;
  }

  const key = trimmed.slice(0, separator).trim();
  let value = trimmed.slice(separator + 1).trim();
  if (!key) {
    return null;
  }

  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnvFile(filePath) {
  try {
    if (!fsSync.existsSync(filePath)) {
      return;
    }

    const raw = fsSync.readFileSync(filePath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }
      if (typeof process.env[parsed.key] === "undefined") {
        process.env[parsed.key] = parsed.value;
      }
    }
  } catch (error) {
    console.warn(`Could not load env file at ${filePath}: ${error.message}`);
  }
}

loadEnvFile(path.join(ROOT_DIR, ".env"));

async function main() {
  if (!Pool) {
    throw new Error("Postgres driver missing. Run: npm install pg");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Point it to Supabase/Postgres before running migrations.");
  }

  const ssl = process.env.PGSSL === "disable" ? false : { rejectUnauthorized: false };
  const pool = new Pool({ connectionString: databaseUrl, ssl });

  try {
    const files = (await fs.readdir(SQL_DIR))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((left, right) => left.localeCompare(right));

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    for (const file of files) {
      const filePath = path.join(SQL_DIR, file);
      const sql = await fs.readFile(filePath, "utf-8");
      console.log(`Applying ${file}...`);
      await pool.query(sql);
    }

    console.log("Migrations completed successfully.");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
