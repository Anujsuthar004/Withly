import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { appendFile, open, rename, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";

const MAGIC = Buffer.from("WLYBAK01");
const HEADER_SIZE = MAGIC.length + 12;

export async function encryptBackup(source, destination, key) {
  if (key.length !== 32) throw new Error("Backup key must contain exactly 32 bytes.");
  const temporary = `${destination}.${randomBytes(8).toString("hex")}.partial`;
  const iv = randomBytes(12);
  const header = Buffer.concat([MAGIC, iv]);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(header);
  const output = createWriteStream(temporary, { flags: "wx", mode: 0o600 });
  try {
    output.write(header);
    await pipeline(source, cipher, output);
    await appendFile(temporary, cipher.getAuthTag());
    await rename(temporary, destination);
  } catch (error) {
    output.destroy();
    await unlink(temporary).catch(() => {});
    throw error;
  }
}

export async function decryptBackup(source, destination, key) {
  if (key.length !== 32) throw new Error("Backup key must contain exactly 32 bytes.");
  const size = (await stat(source)).size;
  if (size < HEADER_SIZE + 16) throw new Error("Truncated backup.");
  const file = await open(source, "r");
  const header = Buffer.alloc(HEADER_SIZE), tag = Buffer.alloc(16);
  try {
    await file.read(header, 0, header.length, 0);
    await file.read(tag, 0, tag.length, size - tag.length);
  } finally { await file.close(); }
  if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Unsupported backup format.");
  const temporary = `${destination}.${randomBytes(8).toString("hex")}.partial`;
  const decipher = createDecipheriv("aes-256-gcm", key, header.subarray(MAGIC.length));
  decipher.setAAD(header);
  decipher.setAuthTag(tag);
  try {
    await pipeline(createReadStream(source, { start: HEADER_SIZE, end: size - 17 }), decipher,
      createWriteStream(temporary, { flags: "wx", mode: 0o600 }));
    // Never publish unauthenticated plaintext after a wrong key or tampered archive.
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
}
