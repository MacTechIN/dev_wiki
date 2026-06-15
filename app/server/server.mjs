import crypto from 'node:crypto';
import {createReadStream, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import {openDb, nowIso, rootDir} from './db.mjs';
import {createSession, requireUser, verifyPassword} from './auth.mjs';
import {classifySubmission} from './classifier.mjs';
import {approveSubmission, rejectSubmission} from './publisher.mjs';

const port = Number(process.env.DEV_WIKI_API_PORT || 3100);
const db = openDb();
const app = Fastify({logger: true, bodyLimit: 10 * 1024 * 1024});

await app.register(cookie, {
  secret: process.env.DEV_WIKI_COOKIE_SECRET || 'dev-wiki-change-this-secret',
});
await app.register(multipart, {
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 10,
  },
});

function safeName(name) {
  return String(name || 'file').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 160);
}

app.get('/health', async () => ({ok: true, service: 'dev-wiki-api'}));

app.get('/admin', async (_request, reply) => {
  reply.type('text/html; charset=utf-8');
  return readFileSync(join(rootDir, 'app/server/public/admin.html'), 'utf8');
});

app.post('/api/auth/login', async (request, reply) => {
  const {email, password} = request.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email || '');
  if (!user || !(await verifyPassword(password || '', user.password_hash))) {
    return reply.code(401).send({error: 'INVALID_CREDENTIALS'});
  }
  const session = createSession(db, user.id);
  reply.setCookie('devwiki_session', session.token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
  });
  return {id: user.id, email: user.email, displayName: user.display_name, role: user.role};
});

app.post('/api/auth/logout', {preHandler: requireUser(db)}, async (request, reply) => {
  reply.clearCookie('devwiki_session', {path: '/'});
  return {ok: true};
});

app.get('/api/auth/me', {preHandler: requireUser(db)}, async (request) => request.user);

app.post('/api/submissions', {preHandler: requireUser(db)}, async (request, reply) => {
  const id = crypto.randomUUID();
  const now = nowIso();
  const date = new Date();
  const rawRelDir = `llm_wiki/raw/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${id}`;
  const rawDir = join(rootDir, rawRelDir);
  mkdirSync(rawDir, {recursive: true});

  let title = '';
  let body = '';
  let tagHint = '';
  const savedFiles = [];

  if (request.isMultipart()) {
    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const fileId = crypto.randomUUID();
        const storedName = `${fileId}-${safeName(part.filename)}`;
        const storedPath = join(rawDir, storedName);
        let size = 0;
        const chunks = [];
        for await (const chunk of part.file) {
          size += chunk.length;
          chunks.push(chunk);
        }
        writeFileSync(storedPath, Buffer.concat(chunks));
        savedFiles.push({
          id: fileId,
          originalName: part.filename,
          storedPath: `${rawRelDir}/${storedName}`,
          mimeType: part.mimetype,
          size,
        });
      } else {
        if (part.fieldname === 'title') title = String(part.value || '');
        if (part.fieldname === 'body') body = String(part.value || '');
        if (part.fieldname === 'tagHint') tagHint = String(part.value || '');
      }
    }
  } else {
    title = String(request.body?.title || '');
    body = String(request.body?.body || '');
    tagHint = String(request.body?.tagHint || '');
  }

  if (!title.trim()) return reply.code(400).send({error: 'TITLE_REQUIRED'});
  writeFileSync(join(rawDir, 'submission.md'), `# ${title}\n\n${body}\n`, 'utf8');

  db.prepare(`
    INSERT INTO submissions
    (id, author_id, title, body, tag_hint, status, raw_dir, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?, ?)
  `).run(id, request.user.id, title, body, tagHint, rawRelDir, now, now);

  for (const file of savedFiles) {
    db.prepare(`
      INSERT INTO submission_files
      (id, submission_id, original_name, stored_path, mime_type, size_bytes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(file.id, id, file.originalName, file.storedPath, file.mimeType, file.size, now);
  }

  const classification = classifySubmission(db, id);
  return reply.code(201).send({id, status: 'draft_ready', classification});
});

app.get('/api/submissions', {preHandler: requireUser(db)}, async () => {
  return db.prepare(`
    SELECT id, title, status, category, summary, draft_path, published_path, created_at, updated_at
    FROM submissions ORDER BY created_at DESC
  `).all();
});

app.get('/api/submissions/:id', {preHandler: requireUser(db)}, async (request, reply) => {
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(request.params.id);
  if (!row) return reply.code(404).send({error: 'NOT_FOUND'});
  const files = db.prepare('SELECT * FROM submission_files WHERE submission_id = ?').all(row.id);
  let draft = '';
  if (row.draft_path) {
    try {
      draft = readFileSync(join(rootDir, row.draft_path), 'utf8');
    } catch {
      draft = '';
    }
  }
  return {...row, files, draft};
});

app.post('/api/submissions/:id/reclassify', {preHandler: requireUser(db, ['reviewer', 'admin'])}, async (request) => {
  return classifySubmission(db, request.params.id);
});

app.post('/api/reviews/:id/approve', {preHandler: requireUser(db, ['reviewer', 'admin'])}, async (request) => {
  return approveSubmission(db, request.params.id, request.user, request.body?.note || '');
});

app.post('/api/reviews/:id/reject', {preHandler: requireUser(db, ['reviewer', 'admin'])}, async (request) => {
  return rejectSubmission(db, request.params.id, request.user, request.body?.note || '');
});

app.get('/api/raw/:submissionId/:fileName', {preHandler: requireUser(db)}, async (request, reply) => {
  const row = db.prepare('SELECT raw_dir FROM submissions WHERE id = ?').get(request.params.submissionId);
  if (!row) return reply.code(404).send({error: 'NOT_FOUND'});
  return reply.send(createReadStream(join(rootDir, row.raw_dir, request.params.fileName)));
});

await app.listen({host: '0.0.0.0', port});
