import crypto from 'node:crypto';
import {appendFileSync, copyFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {nowIso, rootDir} from './db.mjs';

function appendWikiLog(line) {
  appendFileSync(join(rootDir, 'llm_wiki', 'log.md'), `\n## [${nowIso()}] ${line}\n`, 'utf8');
}

function ensureUniquePath(relPath) {
  const absolute = join(rootDir, relPath);
  if (!existsSync(absolute)) return relPath;
  const suffix = crypto.randomUUID().slice(0, 8);
  return relPath.replace(/\.md$/, `-${suffix}.md`);
}

export function approveSubmission(db, submissionId, reviewer, note = '') {
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) throw new Error(`submission not found: ${submissionId}`);
  if (!submission.draft_path || !submission.classification_json) {
    throw new Error('submission has no draft to publish');
  }
  const classification = JSON.parse(submission.classification_json);
  const publishedPath = ensureUniquePath(classification.targetPath);
  mkdirSync(dirname(join(rootDir, publishedPath)), {recursive: true});
  copyFileSync(join(rootDir, submission.draft_path), join(rootDir, publishedPath));

  db.prepare(`
    UPDATE submissions
    SET status = 'published', published_path = ?, updated_at = ?
    WHERE id = ?
  `).run(publishedPath, nowIso(), submissionId);
  db.prepare(`
    INSERT INTO review_events (id, submission_id, reviewer_id, action, note, created_at)
    VALUES (?, ?, ?, 'approve', ?, ?)
  `).run(crypto.randomUUID(), submissionId, reviewer.id, note, nowIso());
  appendWikiLog(`publish | ${submission.title} | ${publishedPath} | reviewer=${reviewer.email}`);

  const buildOutput = execFileSync('npm', ['run', 'build'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {publishedPath, buildOutput};
}

export function rejectSubmission(db, submissionId, reviewer, note = '') {
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) throw new Error(`submission not found: ${submissionId}`);
  db.prepare(`
    UPDATE submissions SET status = 'rejected', updated_at = ? WHERE id = ?
  `).run(nowIso(), submissionId);
  db.prepare(`
    INSERT INTO review_events (id, submission_id, reviewer_id, action, note, created_at)
    VALUES (?, ?, ?, 'reject', ?, ?)
  `).run(crypto.randomUUID(), submissionId, reviewer.id, note, nowIso());
  appendWikiLog(`reject | ${submission.title} | reviewer=${reviewer.email}`);
  return {ok: true};
}
