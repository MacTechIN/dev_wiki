import crypto from 'node:crypto';
import {appendFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {nowIso, rootDir} from './db.mjs';

const categoryRules = [
  ['operations', ['배포', '운영', '장애', '모니터링', '로그', '알림', '복구', '서버', 'runbook']],
  ['decisions', ['결정', '의사결정', '채택', '대안', '근거', 'dec', 'adr']],
  ['standards', ['표준', '규칙', '코딩', '리뷰', '컨벤션', '가이드', '정책']],
  ['development', ['api', '아키텍처', '개발', '구현', '데이터', 'db', '모델', '컴포넌트', '설계']],
];

const categoryDir = {
  development: 'development',
  operations: 'operations',
  standards: 'standards',
  decisions: 'decisions',
  knowledge: 'knowledge',
};

export function slugify(input) {
  return String(input)
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|#%{}^~[\]`]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || crypto.randomUUID();
}

export function classifyText(title, body, tagHint = '') {
  const text = `${title}\n${tagHint}\n${body}`.toLowerCase();
  for (const [category, words] of categoryRules) {
    if (words.some((word) => text.includes(word.toLowerCase()))) {
      return category;
    }
  }
  return 'knowledge';
}

function summarize(body) {
  const compact = body.replace(/\s+/g, ' ').trim();
  if (!compact) return '원문 본문이 비어 있어 첨부 파일 또는 제목 기준으로 분류했습니다.';
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

function appendWikiLog(line) {
  const logPath = join(rootDir, 'llm_wiki', 'log.md');
  appendFileSync(logPath, `\n## [${nowIso()}] ${line}\n`, 'utf8');
}

function updateIndex(entry) {
  const indexPath = join(rootDir, 'llm_wiki', 'index.md');
  let current = '';
  try {
    current = readFileSync(indexPath, 'utf8');
  } catch {
    current = '# LLM Wiki Index\n';
  }
  if (!current.includes(entry)) {
    writeFileSync(indexPath, `${current.trim()}\n\n${entry}\n`, 'utf8');
  }
}

export function classifySubmission(db, submissionId) {
  const submission = db.prepare('SELECT * FROM submissions WHERE id = ?').get(submissionId);
  if (!submission) throw new Error(`submission not found: ${submissionId}`);

  const category = classifyText(submission.title, submission.body, submission.tag_hint || '');
  const slug = slugify(submission.title);
  const targetPath = `docs/${categoryDir[category]}/${slug}.md`;
  const summary = summarize(submission.body);
  const draftRelPath = `llm_wiki/draft/${submission.id}.md`;
  const draftPath = join(rootDir, draftRelPath);
  mkdirSync(dirname(draftPath), {recursive: true});

  const draft = `---
title: ${submission.title.replace(/:/g, ' -')}
description: ${summary.replace(/:/g, ' -')}
tags: [${category}, llm-wiki]
---

# ${submission.title}

## 요약

${summary}

## 주요 내용

${submission.body || '본문이 비어 있습니다. 첨부 파일을 확인하세요.'}

## 분류 결과

- 카테고리: \`${category}\`
- 발행 후보 경로: \`${targetPath}\`
- 분류 기준: 제목, 본문, 태그 힌트를 기준으로 LLM Wiki 스키마의 업무 카테고리에 매핑했습니다.

## 관련 문서 후보

- [Dev Wiki 개요](/)
- [시스템 아키텍처](/development/architecture/)
- [배포 Runbook](/operations/deployment/)

## 원본 출처

- submission id: \`${submission.id}\`
- 작성자 id: \`${submission.author_id}\`
- 원본 저장 위치: \`${submission.raw_dir}\`
`;

  writeFileSync(draftPath, draft, 'utf8');
  const classification = {
    category,
    targetPath,
    summary,
    draftPath: draftRelPath,
    related: ['docs/index.md', 'docs/development/architecture.md', 'docs/operations/deployment.md'],
  };

  db.prepare(`
    UPDATE submissions
    SET status = 'draft_ready',
        category = ?,
        summary = ?,
        draft_path = ?,
        classification_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(category, summary, draftRelPath, JSON.stringify(classification), nowIso(), submission.id);

  updateIndex(`- [${submission.title}](draft/${submission.id}.md) — ${category}, ${summary}`);
  appendWikiLog(`classify | ${submission.title} | ${category} | ${submission.id}`);
  return classification;
}
