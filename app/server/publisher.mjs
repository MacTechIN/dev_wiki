import crypto from 'node:crypto';
import {appendFileSync, copyFileSync, existsSync, mkdirSync, rmSync} from 'node:fs';
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

function runBuild() {
  return execFileSync('npm', ['run', 'build'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

export function approveSubmission(db, submissionId, reviewer, note = '') {
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) throw new Error(`submission not found: ${submissionId}`);
  if (!submission.draft_path || !submission.classification_json) {
    throw new Error('submission has no draft to publish');
  }
  const classification = JSON.parse(submission.classification_json);
  const publishedPath = ensureUniquePath(classification.targetPath);
  const publishedAbs = join(rootDir, publishedPath);

  // 빌드가 성공해야만 발행을 확정한다. 실패하면 복사한 문서를 되돌려
  // docs/ 에 깨진 문서가 남아 이후 빌드를 막는 상황을 방지한다.
  mkdirSync(dirname(publishedAbs), {recursive: true});
  copyFileSync(join(rootDir, submission.draft_path), publishedAbs);

  let buildOutput;
  try {
    buildOutput = runBuild();
  } catch (buildError) {
    rmSync(publishedAbs, {force: true});
    appendWikiLog(`publish-rollback | ${submission.title} | ${publishedPath} | reviewer=${reviewer.email}`);
    const error = new Error(`build failed, publish rolled back: ${publishedPath}`);
    error.code = 'BUILD_FAILED';
    error.cause = buildError;
    error.buildOutput = `${buildError.stdout || ''}${buildError.stderr || ''}`.trim();
    throw error;
  }

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
