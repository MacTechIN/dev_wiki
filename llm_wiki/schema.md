# LLM Wiki 운영 스키마

이 문서는 Dev Wiki의 LLM 분류기가 따라야 할 운영 규칙입니다. Karpathy의 LLM Wiki 패턴을 사내 업무 문서에 맞게 적용합니다.

## 계층

1. Raw sources
   - 사용자가 업로드한 원본 글과 파일입니다.
   - 원본은 불변으로 보관합니다.
   - 경로: `llm_wiki/raw/YYYY/MM/{submission_id}/`

2. Draft wiki
   - LLM이 원본을 읽고 만든 초안입니다.
   - 승인 전에는 Docusaurus `docs/`에 반영하지 않습니다.
   - 경로: `llm_wiki/draft/{submission_id}.md`

3. Published wiki
   - 담당자 승인 후 Docusaurus `docs/` 아래 발행된 문서입니다.
   - 사용자는 `/wiki/` 사이트에서 읽습니다.

## 분류 카테고리

| 카테고리 | 발행 경로 | 설명 |
| --- | --- | --- |
| development | `docs/development/` | 아키텍처, API, 구현 지식, 데이터 모델 |
| operations | `docs/operations/` | 배포, 모니터링, 장애 대응, Runbook |
| standards | `docs/standards/` | 코딩 표준, 리뷰 규칙, 업무 규칙 |
| decisions | `docs/decisions/` | 기술/운영 의사결정 기록 |
| knowledge | `docs/knowledge/` | 위 범주에 속하지 않는 일반 업무 지식 |

## 처리 규칙

- 원문을 임의로 삭제하거나 덮어쓰지 않습니다.
- 초안에는 원본 출처, 작성자, 분류 이유, 관련 문서를 포함합니다.
- 기존 문서와 충돌 가능성이 있으면 `주의할 점` 섹션에 표시합니다.
- 보안상 민감한 토큰, 비밀번호, 개인정보는 발행 초안에 그대로 넣지 않습니다.
- 승인 전에는 Docusaurus `docs/`에 반영하지 않습니다.

## 초안 형식

```md
---
title: 문서 제목
description: 한 줄 설명
tags: [category, source]
---

# 문서 제목

## 요약

## 주요 내용

## 분류 이유

## 관련 문서 후보

## 원본 출처
```
