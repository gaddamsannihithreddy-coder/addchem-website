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

const iterations = 210000;
const salt = crypto.randomBytes(16).toString('base64url');
const derived = crypto.pbkdf2Sync(password, Buffer.from(salt), iterations, 32, 'sha256').toString('base64url');
const sql = `INSERT INTO staff_users (email,password_hash,password_salt,role) VALUES ('${email.replaceAll("'", "''")}','pbkdf2-sha256:${iterations}:${derived}','${salt}','staff');\n`;
fs.writeFileSync(new URL('./staff-account.sql', import.meta.url), sql, { mode: 0o600 });
console.log('Created scripts/staff-account.sql. Run it against your D1 database, then delete that file.');
