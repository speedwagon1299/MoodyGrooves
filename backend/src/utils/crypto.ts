import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-please-change-32-char";
/* Session Secret for storing Refresh Token in Redis */
const KEY = crypto.createHash("sha256").update(String(SESSION_SECRET)).digest();

export function encrypt(text: string): string {
  // initialization vector
  const iv = crypto.randomBytes(12);  
  // cipher created using iv and key through AES-256 in GCM mode
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  // encrypts utf-8 plaintext using cipher
  // update finishes blocks, remaining dealt with by final
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  // equivalent to signature
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decrypt(data: string): string {
  const b = Buffer.from(data, "base64");
  const iv = b.subarray(0, 12);
  const tag = b.subarray(12, 28);
  const encrypted = b.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  // if tag does not match it will throw error
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return out.toString("utf8");
}

