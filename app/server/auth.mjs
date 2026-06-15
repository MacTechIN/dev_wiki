import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import {nowIso} from './db.mjs';

const sessionDays = Number(process.env.DEV_WIKI_SESSION_DAYS || 7);

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function createSession(db, userId) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `).run(tokenHash, userId, expiresAt, nowIso());
  return {token, expiresAt};
}

export function getSessionUser(db, token) {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const row = db.prepare(`
    SELECT u.id, u.email, u.display_name, u.role, s.expires_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ?
  `).get(tokenHash);
  if (!row) return null;
  if (Date.parse(row.expires_at) < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  return row;
}

export function requireUser(db, roles = []) {
  return async function requireUserHook(request, reply) {
    const user = getSessionUser(db, request.cookies?.devwiki_session);
    if (!user) {
      return reply.code(401).send({error: 'UNAUTHENTICATED'});
    }
    if (roles.length > 0 && !roles.includes(user.role)) {
      return reply.code(403).send({error: 'FORBIDDEN'});
    }
    request.user = user;
  };
}
