---
title: LLM Wiki 확장 운영 문서
description: 로그인, 제출, LLM 분류, 승인 발행 기능의 운영 기준
---

# LLM Wiki 확장 운영 문서

Dev Wiki는 정적 Docusaurus 문서 포털을 유지하면서, 별도 API 서버를 통해 로그인, 글/파일 제출, LLM 분류, 승인 발행 기능을 제공합니다.

## 구성 요소

| 구성 | 경로 | 설명 |
| --- | --- | --- |
| API 서버 | `app/server/` | 로그인, 제출, 승인, 발행 API |
| DB | `app/data/devwiki.sqlite` | 사용자, 세션, 제출, 리뷰 이력 |
| Raw sources | `llm_wiki/raw/` | 사용자가 올린 원본 자료 |
| Drafts | `llm_wiki/draft/` | LLM 분류 초안 |
| Schema | `llm_wiki/schema.md` | LLM Wiki 운영 규칙 |
| Log | `llm_wiki/log.md` | ingest/classify/publish 이력 |

## 실행

```bash
npm run llm:server
```

기본 포트는 `3100`입니다.

```text
http://100.83.34.122:3100/admin
```

## 사용자 생성

```bash
npm run user:create -- admin@example.com 'change-this-password' admin 'Admin'
```

역할은 `user`, `reviewer`, `admin` 중 하나입니다.

## 제출 흐름

1. 사용자가 `/admin`에서 로그인합니다.
2. 제목, 본문, 태그 힌트, 첨부 파일을 제출합니다.
3. 원본은 `llm_wiki/raw/`에 불변 저장됩니다.
4. 분류기는 `llm_wiki/schema.md` 기준으로 카테고리를 정하고 초안을 생성합니다.
5. reviewer/admin이 초안을 승인하면 `docs/` 아래 발행됩니다.
6. 발행 후 `npm run build`가 실행되어 `/wiki/` 검색 색인에 반영됩니다.

## 보안 주의

- 운영 전 `DEV_WIKI_COOKIE_SECRET`을 반드시 강한 값으로 설정합니다.
- 초기 계정 비밀번호는 즉시 변경합니다.
- 첨부 파일 크기와 확장자 정책은 운영 환경에 맞게 강화합니다.
- 민감정보가 포함된 자료는 발행 전 반드시 검토합니다.
