import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { encryptBackup, decryptBackup } from "../../scripts/backup-crypto.mjs";

test("backup encryption round-trips and rejects tampering/wrong keys without publishing plaintext", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "withly-crypto-test-"));
  const encrypted = path.join(directory, "backup.enc"), decoded = path.join(directory, "decoded");
  const key = randomBytes(32), data = Buffer.from("Private test-only account data");
  try {
    await encryptBackup(Readable.from([data]), encrypted, key);
    assert.equal((await readFile(encrypted)).includes(data), false);
    await decryptBackup(encrypted, decoded, key);
    assert.deepEqual(await readFile(decoded), data);
    await assert.rejects(decryptBackup(encrypted, path.join(directory, "wrong-key"), randomBytes(32)));
    const bytes = await readFile(encrypted); bytes[23] ^= 1; await writeFile(encrypted, bytes);
    await assert.rejects(decryptBackup(encrypted, path.join(directory, "tampered"), key));
    assert.deepEqual((await readdir(directory)).sort(), ["backup.enc", "decoded"]);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
