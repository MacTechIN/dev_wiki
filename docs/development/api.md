---
title: API 문서 작성 규칙
description: API 명세를 일관되게 작성하기 위한 기준
---

# API 문서 작성 규칙

API 문서는 구현자와 소비자가 같은 기준으로 이해할 수 있도록 동일한 구조로 작성합니다.

## 기본 구조

| 항목 | 설명 |
| --- | --- |
| Endpoint | HTTP method와 path |
| Auth | 인증 방식과 권한 |
| Request | path, query, body |
| Response | 성공 응답 예시 |
| Error | 오류 코드와 문제 해결 방법 |

## 예시

```http
GET /api/projects/{projectId}
Authorization: Bearer {token}
```

## 변경 관리

호환성이 깨지는 변경은 사전에 공지하고, 마이그레이션 문서를 함께 작성합니다.

## 체크리스트

- 인증/권한 조건을 명확히 적었는가?
- 요청/응답 예시가 실제 스키마와 일치하는가?
- 오류 응답과 재시도 가능 여부를 적었는가?
- 버전 변경 또는 deprecation 계획이 있는가?
