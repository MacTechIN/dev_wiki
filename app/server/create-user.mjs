import crypto from 'node:crypto';
import {openDb, nowIso} from './db.mjs';
import {hashPassword} from './auth.mjs';

const [email, password, role = 'admin', displayName = email] = process.argv.slice(2);

if (!email || !password) {
  console.error('Usage: node app/server/create-user.mjs <email> <password> [role] [displayName]');
  process.exit(1);
}

if (!['user', 'reviewer', 'admin'].includes(role)) {
  console.error('role must be one of: user, reviewer, admin');
  process.exit(1);
}

const db = openDb();
const passwordHash = await hashPassword(password);
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare(`
    UPDATE users SET display_name = ?, password_hash = ?, role = ? WHERE email = ?
  `).run(displayName, passwordHash, role, email);
  console.log(`updated user: ${email}`);
} else {
  db.prepare(`
    INSERT INTO users (id, email, display_name, password_hash, role, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), email, displayName, passwordHash, role, nowIso());
  console.log(`created user: ${email}`);
}
