# Dev Wiki 인수인계 문서

> 이 문서 하나만 읽어도 프로젝트를 이어받아 실행·개발·배포할 수 있도록 작성했습니다.
> 최초 작성: 2026-09-12 / 이관 담당: jnh 워크스테이션 → maindev

---

## 1. 한눈에 보기

| 항목 | 값 |
| --- | --- |
| 프로젝트 | Dev Wiki — 사내 개발팀 지식 베이스 |
| 구성 | Docusaurus v3 정적 위키 **+** Fastify API 서버(제출·분류·승인·발행) |
| 이관 후 경로 | `/home/sam/workspace/dev_wiki` (maindev) |
| 이관 전 경로 | `/home/jnh/Documents/www/dev_wiki` (jnh 워크스테이션) |
| Git 원격 | `git@github.com:MacTechIN/dev_wiki.git` (branch `main`) |
| 위키 접속 | `http://100.100.1.100:3000/wiki/` (Docusaurus serve) |
| 관리 UI | `http://100.100.1.100:3100/admin` (API 서버) |
| 런타임 | Node.js (maindev: v22.23.1 / 개발 당시: v24.16.0) |
| 현재 진행도 | 파이프라인 **동작 검증 완료**, 운영 배포 **미완료** |

**프로젝트의 핵심 아이디어**: 팀원이 관리 UI에 글·파일을 제출하면, 원본은
`llm_wiki/raw/`에 불변 저장되고, 분류기가 카테고리를 정해 초안을 만들고,
reviewer/admin이 승인하면 `docs/` 아래로 발행되며 Docusaurus가 재빌드돼
위키와 검색 색인에 반영됩니다. (Karpathy LLM Wiki의 raw → draft → published
3계층 패턴, 규칙은 `llm_wiki/schema.md`)

---

## 2. 5분 안에 띄우기

```bash
cd ~/workspace/dev_wiki

# 1) 의존성 (lockfile 그대로 재현)
npm ci

# 2) 정적 위키 빌드 → build/
npm run build

# 3) 위키 서비스 (포트 3000)
npm run serve -- --port 3000            # http://100.100.1.100:3000/wiki/

# 4) API 서버 + 관리 UI (포트 3100)
nohup node app/server/server.mjs >> .llm_api.log 2>&1 & echo $! > .llm_api.pid
curl -s localhost:3100/api/health       # {"ok":true,"service":"dev-wiki-api"}
                                        # http://100.100.1.100:3100/admin
```

포트를 바꿔야 하면 `DEV_WIKI_API_PORT=3101 node app/server/server.mjs`.
**재시작 전에 반드시 6장 「운영 함정」을 읽으세요.**

---

## 3. 디렉터리 구조

```text
dev_wiki/
├── docs/                        # 위키 본문 (발행된 문서). Docusaurus 소스
│   ├── index.md
│   ├── development/             architecture.md, api.md
│   ├── operations/              deployment.md, llm-wiki-extension.md
│   ├── standards/               coding.md
│   ├── decisions/               DEC-001-docusaurus-wiki.md
│   └── knowledge/               (분류기가 'knowledge'로 분류한 문서)
├── app/
│   ├── server/                  # Fastify API 서버
│   │   ├── server.mjs           라우트 정의, 서버 기동
│   │   ├── db.mjs               node:sqlite 스키마 + openDb()
│   │   ├── auth.mjs             bcrypt 해시, 세션, requireUser() 역할 가드
│   │   ├── classifier.mjs       키워드 규칙 분류 + 초안 생성
│   │   ├── publisher.mjs        승인/발행/거절 + 빌드 트랜잭션
│   │   ├── worker.mjs           미분류 제출 일괄 처리 (batch)
│   │   ├── create-user.mjs      CLI 사용자 생성/갱신
│   │   └── public/admin.html    관리 UI (단일 파일, 프레임워크 없음)
│   └── data/devwiki.sqlite      # DB (gitignored, 이관 시 함께 옮김)
├── llm_wiki/
│   ├── schema.md                # 분류·발행 운영 규칙 (사람이 관리)
│   ├── index.md                 # 문서 카탈로그 (분류기가 추가)
│   ├── log.md                   # 감사 로그 (분류기·발행기가 추가)
│   ├── raw/                     # 제출 원본, 불변 (gitignored)
│   └── draft/                   # 분류 초안 (gitignored)
├── docusaurus.config.ts         # baseUrl=/wiki/, locale=ko, 로컬 검색
├── sidebars.ts
├── src/css/custom.css
├── README.md / README_DEPLOY.md
└── HANDOVER.md                  # ← 이 문서
```

---

## 4. 데이터 모델 (`app/server/db.mjs`)

`node:sqlite`의 `DatabaseSync` 사용 — **better-sqlite3 등 네이티브 의존성이
없습니다**. WAL 모드, `foreign_keys = ON`.

| 테이블 | 역할 | 주요 컬럼 |
| --- | --- | --- |
| `users` | 계정 | `email`(unique), `password_hash`(bcrypt), `role` ∈ user/reviewer/admin |
| `sessions` | 로그인 세션 | `token_hash`(sha256), `expires_at` (기본 7일) |
| `submissions` | 제출 | `status`, `category`, `draft_path`, `published_path`, `classification_json` |
| `submission_files` | 첨부 | `raw_dir` 하위 파일 메타 |
| `review_events` | 감사 | `action` ∈ approve/reject, `reviewer_id`, `note` |

`submissions.status` 흐름:
`submitted` → `draft_ready` → `published` (또는 `rejected`, `needs_reclassify`)

---

## 5. API 목록 (`app/server/server.mjs`)

| Method | Path | 권한 |
| --- | --- | --- |
| GET | `/`, `/admin.html` | — (→ `/admin` 리다이렉트) |
| GET | `/admin` | — (관리 UI HTML) |
| GET | `/health`, `/api/health` | — |
| POST | `/api/auth/login` | — |
| POST | `/api/auth/logout` | 로그인 |
| GET | `/api/auth/me` | 로그인 |
| GET/POST | `/api/users` | **admin** |
| PATCH/DELETE | `/api/users/:id` | **admin** |
| POST/GET | `/api/submissions` | 로그인 |
| GET | `/api/submissions/:id` | 로그인 |
| POST | `/api/submissions/:id/reclassify` | reviewer/admin |
| POST | `/api/reviews/:id/approve` | reviewer/admin |
| POST | `/api/reviews/:id/reject` | reviewer/admin |
| GET | `/api/raw/:submissionId/:fileName` | 로그인 |

인증은 `@fastify/cookie` 기반 세션 쿠키. 역할 가드는
`requireUser(db, ['admin'])` 형태의 preHandler.

### 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `DEV_WIKI_API_PORT` | `3100` | API 서버 포트 |
| `DEV_WIKI_DB` | `app/data/devwiki.sqlite` | DB 파일 경로 |
| `DEV_WIKI_COOKIE_SECRET` | `dev-wiki-change-this-secret` | ⚠ **운영 전 필수 변경** |
| `DEV_WIKI_SESSION_DAYS` | `7` | 세션 유효기간 |

---

## 6. 운영 함정 — 반드시 읽을 것

### 6-1. 재시작이 먹지 않는 PID 함정 (실제로 두 번 당했습니다)

`pgrep -f "app/server/server.mjs"`는 **같은 문자열을 명령줄에 포함한 셸
래퍼 프로세스까지** 잡습니다. 그 PID를 죽이면 실제 서버는 살아남고, 새로
띄운 서버는 `EADDRINUSE`로 즉시 죽습니다. 결과적으로 **소스를 고쳐도
구버전 서버가 계속 응답해 "수정이 반영되지 않는" 것처럼 보입니다.**

```bash
# 실제 서버 PID 찾기 (cmdline 정확히 매칭)
for p in /proc/[0-9]*; do
  tr '\0' ' ' < "$p/cmdline" 2>/dev/null | grep -q '^node app/server/server.mjs' \
    && echo "${p#/proc/}"
done

# 기동은 PID를 직접 기록 (pgrep 쓰지 말 것)
nohup node app/server/server.mjs >> .llm_api.log 2>&1 & echo $! > .llm_api.pid

# 반영 검증: 기동 시각이 소스 mtime보다 나중인지 확인
ps -p "$(cat .llm_api.pid)" -o lstart=
stat -c '%y %n' app/server/*.mjs
```

기동 실패는 조용합니다. 띄운 직후 `tail -5 .llm_api.log`로 `EADDRINUSE`를
확인하는 습관을 권합니다.

### 6-2. 한글 파일명 Unicode 정규화 (NFC / NFD)

분류기의 `slugify()`는 반드시 `.normalize('NFC')`를 써야 합니다. 과거
`NFKD`를 쓰던 탓에 한글 파일명이 **분해형(NFD)**으로 저장되어(같은 이름이
47바이트 vs 95바이트) 셸의 `rm "docs/.../한글.md"`가 조용히 실패하고,
`ensureUniquePath()`가 접미사 붙은 중복 파일을 또 만들었습니다.
수정되어 있지만, 한글 파일명을 셸로 다룰 때는 `find`/`readdirSync` 결과를
그대로 쓰는 편이 안전합니다.

### 6-3. 프런트매터는 반드시 따옴표로

제목에 `[`, `]`, `:`, `"`가 들어가면 YAML이 flow sequence로 오해해
**위키 빌드 전체가 죽습니다**. `classifier.mjs`의 `yamlString()`이
처리하고 있으니, 프런트매터 생성 코드를 고칠 때 우회하지 마세요.

### 6-4. 승인은 빌드 성공 후에만 확정됩니다

`publisher.mjs`의 순서: **복사 → 빌드 → (성공 시에만) DB 확정 → 감사 로그**.
빌드가 실패하면 복사본을 `rmSync`로 되돌리고, `llm_wiki/log.md`에
`publish-rollback`을 남기고 `code='BUILD_FAILED'` 에러를 던지며, 라우트가
이를 **HTTP 422 + 한글 안내 + 빌드 출력**으로 변환합니다.
이 순서를 되돌리면 깨진 문서가 `docs/`에 남아 **이후 모든 빌드를 막습니다.**

---

## 7. 계정 정보

| 이메일 | 역할 | 상태 |
| --- | --- | --- |
| `admin@devwiki.local` | admin | ⚠ **비밀번호 분실** — 로그인 불가 |
| `wooriszhome@gmail.com` | admin | ✅ 사용 가능 |

- 비밀번호는 이 문서에 적지 않았습니다. **별도 경로로 전달**받으세요.
- 새 계정 생성 / 비밀번호 재설정(같은 이메일이면 upsert):

  ```bash
  npm run user:create -- <email> '<password>' <user|reviewer|admin> '<표시 이름>'
  ```

- 인수 직후 권장 조치:
  1. `DEV_WIKI_COOKIE_SECRET`을 강한 값으로 설정 (기존 세션 8건 무효화됨)
  2. 인수자 본인 admin 계정 생성
  3. 분실된 `admin@devwiki.local` 비밀번호 재설정 또는 계정 삭제
  4. `wooriszhome@gmail.com` 계정 처리 방침 결정(이관자 계정)

> 로그인 API는 이메일을 `.trim().toLowerCase()` 하지만
> `create-user.mjs`는 소문자화하지 않습니다. 대문자가 섞인 이메일로
> 계정을 만들면 로그인이 안 됩니다. (→ 9장 P2 이슈)

---

## 8. 현재 상태

### 검증 완료

- 제출 → 분류 → 승인 → 발행 파이프라인 **엔드투엔드 동작 확인**
- 승인 롤백: 깨진 초안 승인 시 **HTTP 422**, `docs/` 잔여물 없음, DB 상태
  유지(`draft_ready`), `review_events` 미기록, 감사 로그에 `publish-rollback`,
  **이후 `npm run build` 정상 성공**
- 정상 경로: 초안 수정 후 재승인 → **200**, `published`, 발행 경로 생성
- 관리자 사용자 CRUD, `/api/health`, 로그인/세션

### 미완료

- 운영 배포(리버스 프록시, systemd 등록, 재부팅 자동 실행) — **전부 미착수**
- 분류기가 **실제 LLM을 호출하지 않습니다.** 현재는 키워드 규칙
  (`categoryRules` in `classifier.mjs`)으로 development/operations/standards/
  decisions/knowledge에 매핑합니다. "LLM 분류"는 아직 이름뿐입니다.
- 자동화 테스트 없음
- `maindev`에는 Caddy가 설치돼 있지 않습니다. `README_DEPLOY.md`의
  Caddy 예시와 `/etc/dgo/Caddyfile.dev` 경로는 **다른 장비(d-go) 기준**이라
  그대로 쓸 수 없습니다.

---

## 9. 알려진 이슈 (우선순위순)

### P1 — 발행 중 API 서버 전체가 멈춤

`publisher.mjs`의 `runBuild()`가 `execFileSync('npm', ['run','build'])`로
**동기 실행**됩니다. 빌드에 5~25초가 걸리는 동안 Node 이벤트 루프가 막혀
모든 요청이 대기합니다. 승인이 잦아지면 바로 체감됩니다.
→ 해결 방향: 빌드를 큐에 넣고 비동기 실행, 승인 API는 202 + 상태 폴링.
단, **비동기로 바꿀 때 6-4의 트랜잭션 순서를 깨뜨리지 마세요.**

### P2 — 이미 발행된 제출을 다시 승인하면 중복 문서가 생김

`ensureUniquePath()`가 접미사를 붙여 `...-0b907da4.md` 같은 파일을 또
만듭니다. 재승인은 같은 경로를 덮어써야 맞습니다.
(검증 중 `review_events`에 approve가 5건 쌓인 원인)

### P2 — `create-user.mjs`가 이메일을 소문자화하지 않음

로그인은 소문자화하므로 대문자 섞인 이메일 계정은 로그인 불가.

### P3 — `/api/auth/me`가 `createdAt`을 반환하지 않음

`auth.mjs`의 `getSessionUser()` SELECT가 `u.created_at`을 빼먹었습니다.

### P3 — 첨부 파일 정책이 느슨함

크기·확장자 제한을 운영 환경 기준으로 강화해야 합니다
(`docs/operations/llm-wiki-extension.md` 보안 주의 참고).

---

## 10. 정리 대상 — 검증용 테스트 산출물

파이프라인 검증 과정에서 만든 것들입니다. **의도적으로 커밋하지 않고
그대로 넘깁니다** (실제 위키 문서로 굳히지 않기 위해). 인수자가 판단해
지우거나 남기세요.

| 대상 | 위치 | 상태 |
| --- | --- | --- |
| 테스트 문서 2건 | `docs/operations/test-파이프라인-점검용-배포-노트.md`, `docs/knowledge/롤백-검증용-임시-문서.md` | git 미추적, 위키에 실제 발행됨 |
| 테스트 제출 2건 | DB `submissions` | 둘 다 `published` |
| 승인 이력 5건 | DB `review_events` | 반복 승인 검증 흔적 |
| 원본·초안 | `llm_wiki/raw/2026/`, `llm_wiki/draft/*.md` | gitignored |
| 감사 로그 | `llm_wiki/log.md`, `llm_wiki/index.md` | **커밋됨** (감사 기록이므로 보존) |

전체 삭제 절차:

```bash
# 1) 발행 문서 (한글 파일명은 find로 지울 것 — 6-2 참고)
find docs/operations docs/knowledge -name '*파이프라인*' -o -name '*롤백*' | xargs -r rm -v
# 2) DB 정리
node -e "const{DatabaseSync}=require('node:sqlite');const d=new DatabaseSync('app/data/devwiki.sqlite');
d.exec(\"DELETE FROM review_events; DELETE FROM submission_files; DELETE FROM submissions;\");d.close()"
# 3) 런타임 데이터
rm -rf llm_wiki/raw/2026 llm_wiki/draft/*.md
# 4) 재빌드로 위키에서 제거 확인
npm run build
```

---

## 11. 이관 시 변경한 사항

경로와 접속 주소가 장비와 함께 바뀌었으므로 문서를 갱신했습니다.

| 항목 | 이전 | 이후 |
| --- | --- | --- |
| 프로젝트 절대경로 | `/home/jnh/workspace/dev_wiki` (존재하지 않던 경로) | `/home/sam/workspace/dev_wiki` |
| 접속 IP | `100.83.34.122` (jnh 워크스테이션 tailscale) | `100.100.1.100` (maindev tailscale) |
| 갱신 파일 | `README.md`, `README_DEPLOY.md`, `docs/operations/deployment.md`, `docs/operations/llm-wiki-extension.md`, `docusaurus.config.ts` | |

maindev는 LAN `192.168.0.131`로도 접근 가능합니다.

이관 시 **제외한 것**과 그 이유:

| 제외 | 이유 |
| --- | --- |
| `node_modules/` (412MB) | `npm ci`로 lockfile 그대로 재현. Node 24에서 설치된 바이너리를 Node 22로 옮기지 않기 위함 |
| `build/`, `.docusaurus/` | 빌드 산출물. `npm run build`로 재생성 |
| `.llm_api.pid`, `.wiki_serve.pid` | **죽은 PID를 가리키는 파일.** 다른 장비의 PID를 `kill`하면 무관한 프로세스를 죽일 수 있어 옮기지 않았습니다 |

그 밖의 **모든 것**(Git 이력 전체, DB, 원본·초안, 로그, 미추적 테스트 문서)은
그대로 옮겼습니다. DB는 복사 전 `wal_checkpoint(TRUNCATE)`로 단일 파일로
정리하고 `integrity_check: ok`를 확인했습니다.

---

## 12. 다음 작업 제안

1. **운영 배포 완성** — 리버스 프록시로 `/wiki/` 라우팅, API 서버 systemd
   등록, 재부팅 자동 실행. (maindev에 Caddy가 없으므로 프록시 선택부터)
2. **P1 동기 빌드 해소** — 승인 API를 202 + 상태 폴링으로 전환.
3. **재승인 중복 파일 수정** (P2).
4. **분류기에 실제 LLM 연결** — 현재 키워드 규칙을 LLM 호출로 교체하고,
   `llm_wiki/schema.md`를 프롬프트 컨텍스트로 넣는 방향.
5. **테스트 산출물 정리** (10장) 후 깨끗한 상태에서 실사용 시작.
6. **보안 마감** — `DEV_WIKI_COOKIE_SECRET`, 계정 정리, 첨부 정책.

---

## 13. 참고 문서

| 문서 | 내용 |
| --- | --- |
| `README.md` | 프로젝트 목표, 기술 스택, 작성 규칙 |
| `README_DEPLOY.md` | 빌드·배포 절차, 프록시 설정 예시 |
| `docs/operations/deployment.md` | 배포 Runbook (위키에 발행됨) |
| `docs/operations/llm-wiki-extension.md` | API 서버 운영 기준, 보안 주의 |
| `docs/development/architecture.md` | 시스템 아키텍처 |
| `docs/development/api.md` | API 문서 |
| `llm_wiki/schema.md` | 분류·발행 운영 규칙 |
| `docs/decisions/DEC-001-docusaurus-wiki.md` | Docusaurus 채택 의사결정 |
| `llm_wiki/log.md` | 전체 ingest/classify/publish 감사 이력 |
| `git log` | 커밋 메시지에 각 수정의 배경을 상세히 남겼습니다 |
