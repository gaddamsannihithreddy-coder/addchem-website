import crypto from 'node:crypto';
import fs from 'node:fs';
import readline from 'node:readline';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/create-staff.mjs staff@example.com');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));
const password = await ask('Password (entered once, not saved by this script): ');
rl.close();
if (password.length < 10) throw new Error('Use a password of at least 10 characters.');

const iterations = 100000;
// Store the salt itself as standard Base64 and derive from the decoded random bytes.
const salt = crypto.randomBytes(16);
const saltB64 = salt.toString('base64');
const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64');
const safeEmail = email.replaceAll("'", "''");
const sql = `INSERT INTO staff_users (email,password_hash,password_salt,role,active) VALUES ('${safeEmail}','pbkdf2-sha256:${iterations}:${derived}','${saltB64}','staff',1) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash, password_salt=excluded.password_salt, role='staff', active=1;\n`;
const out = new URL('./staff-account.sql', import.meta.url);
fs.writeFileSync(out, sql, { mode: 0o600 });
console.log('Created scripts/staff-account.sql. Run it against your D1 database, then delete that file.');
