import crypto from 'node:crypto';
import readline from 'node:readline';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes('@')) {
  console.error('Usage: node scripts/verify-staff.mjs staff@example.com');
  process.exit(1);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(resolve => rl.question(q, resolve));
const password = await ask('Password to test (not saved): ');
rl.close();

// This utility only verifies local hashing compatibility; it does not access D1.
console.log('Password length:', password.length);
console.log('SHA-256 self-test:', crypto.createHash('sha256').update(password).digest('hex').slice(0, 8));
