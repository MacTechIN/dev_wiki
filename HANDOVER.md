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
| 현재 진행도 | 파이프라인 **동작 검증 완료**, 서비스 **systemd 상주**, 리버스 프록시 **미완료** |
| 서비스 기동 | `systemctl --user start dev-wiki-api dev-wiki-serve` (부팅 자동 실행) |
| 이관 검증 | maindev 실측 완료 → 11장 |
| 먼저 볼 것 | **6장 운영 함정**, **9장 P1 이슈 2건** |

**프로젝트의 핵심 아이디어**: 팀원이 관리 UI에 글·파일을 제출하면, 원본은
`llm_wiki/raw/`에 불변 저장되고, 분류기가 카테고리를 정해 초안을 만들고,
reviewer/admin이 승인하면 `docs/` 아래로 발행되며 Docusaurus가 재빌드돼
위키와 검색 색인에 반영됩니다. (Karpathy LLM Wiki의 raw → draft → published
3계층 패턴, 규칙은 `llm_wiki/schema.md`)

---

## 2. 5분 안에 띄우기

두 서비스는 **systemd 사용자 유닛으로 상주**합니다(2026-09-21 등록).
평상시에는 아래 명령만 쓰면 되고, 수동으로 `node`/`nohup`을 띄울 일은 없습니다.

```bash
# 상태 확인
systemctl --user status dev-wiki-api dev-wiki-serve
curl -s localhost:3100/api/health       # {"ok":true,"service":"dev-wiki-api"}
curl -I localhost:3000/wiki/            # 200

# 기동 / 재시작 / 중지
systemctl --user start   dev-wiki-api dev-wiki-serve
systemctl --user restart dev-wiki-api dev-wiki-serve
systemctl --user stop    dev-wiki-api dev-wiki-serve

# 로그 (nohup 로그 파일 대신 journal 을 봅니다)
journalctl --user -u dev-wiki-api -f
journalctl --user -u dev-wiki-serve -n 50
```

소스를 처음 받았거나 의존성이 없다면 먼저 아래를 한 번 실행합니다.

```bash
cd ~/workspace/dev_wiki
npm ci          # lockfile 그대로 재현
npm run build   # 정적 위키 빌드 → build/ (serve 가 이 디렉터리를 서비스)
```

접속 주소는 위키 `http://100.100.1.100:3000/wiki/`,
관리 UI `http://100.100.1.100:3100/admin` 입니다.

### 유닛과 환경변수 위치

| 항목 | 경로 |
| --- | --- |
| API 유닛 | `~/.config/systemd/user/dev-wiki-api.service` |
| 위키 유닛 | `~/.config/systemd/user/dev-wiki-serve.service` |
| 환경변수(시크릿 포함) | `~/.config/dev-wiki/api.env` (모드 600, **저장소 밖**) |

`DEV_WIKI_COOKIE_SECRET`은 이 env 파일에 강한 랜덤 값으로 들어 있습니다.
포트나 세션 기간을 바꾸려면 env 파일을 고치고
`systemctl --user restart dev-wiki-api` 하세요.

> 유닛의 `Environment=PATH=...`를 지우지 마세요. 승인 시
> `publisher.mjs`가 `npm run build`를 **PATH에서 찾아** 실행하는데,
> systemd 기본 PATH에는 `~/.local/bin`의 node/npm이 없어 발행이 깨집니다.

**운영 함정은 여전히 유효합니다. 6장을 읽으세요.**

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

> **2026-09-21 이후**: 두 서비스를 systemd 사용자 유닛으로 옮겨
> 이 함정은 사실상 사라졌습니다. systemd가 `MainPID`를 정확히 추적하므로
> `systemctl --user restart dev-wiki-api` 한 줄이면 확실히 교체됩니다.
> **`pgrep`으로 찾아 `kill`하지 마세요.** systemd가 모르는 사이에 죽이면
> `Restart=on-failure`가 다시 띄워 혼란만 커집니다. 기동 확인은
> `systemctl --user status dev-wiki-api`와 `journalctl --user -u dev-wiki-api`로 합니다.

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

- systemd 등록과 재부팅 자동 실행 — **완료** (2026-09-21, 2장 참고).
  `Linger=yes`가 켜져 있어 로그인 없이도 부팅 시 기동됩니다.
- 리버스 프록시(80/443에서 `/wiki/` 라우팅) — **미착수**. maindev에 Caddy도
  nginx도 설치돼 있지 않아 프록시 선택부터 해야 합니다.
- 분류기가 **실제 LLM을 호출하지 않습니다.** 현재는 키워드 규칙
  (`categoryRules` in `classifier.mjs`)으로 development/operations/standards/
  decisions/knowledge에 매핑합니다. "LLM 분류"는 아직 이름뿐입니다.
- 자동화 테스트 없음
- `maindev`에는 Caddy가 설치돼 있지 않습니다. `README_DEPLOY.md`의
  Caddy 예시와 `/etc/dgo/Caddyfile.dev` 경로는 **다른 장비(d-go) 기준**이라
  그대로 쓸 수 없습니다.

---

## 9. 알려진 이슈 (우선순위순)

### P1 — API 서버가 모든 인터페이스에 노출됨 (보안)

`server.mjs:260`이 `app.listen({host: '0.0.0.0', port})`이라 사내 LAN
(`192.168.0.131`), tailscale(`100.100.1.100`), docker 브리지까지 전부 열립니다.
기동 로그에서 확인할 수 있습니다.

동시에 `DEV_WIKI_COOKIE_SECRET`이 설정돼 있지 않으면 코드에 박힌 기본값
`'dev-wiki-change-this-secret'`을 사용합니다. **이 둘이 겹치면 같은 네트워크에서
누구나 세션을 위조할 수 있습니다.**

**2026-09-21 부분 조치**: 강한 `DEV_WIKI_COOKIE_SECRET`을
`~/.config/dev-wiki/api.env`(모드 600)에 넣고 systemd 유닛이 주입하도록
했습니다. 기본 시크릿으로 인한 **세션 위조 위험은 해소**되었습니다.
이때 기존 세션 8건은 모두 무효화되어 재로그인이 필요합니다.

**남은 조치**: `server.mjs:260`의 `host`는 아직 `0.0.0.0`입니다. 3100은
여전히 LAN·tailscale·docker 브리지에 열려 있습니다. 모든 API가 로그인을
요구하는 것은 확인했지만(미인증 401), `host`를 `127.0.0.1`로 좁혀
리버스 프록시 뒤에 두거나 방화벽으로 3100을 제한해야 마감됩니다.
같은 장비의 다른 서비스들은 테일넷 IP(`100.100.1.100`)에 직접 바인딩하는
방식을 씁니다. `host`를 환경변수로 뽑아 같은 방식으로 맞추는 것을 권합니다.

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

## 11. 이관 검증 결과 (2026-09-12, maindev 실측)

이관 직후 maindev에서 실제로 확인한 항목입니다.

| 검증 항목 | 결과 |
| --- | --- |
| 파일 전송 | 4,806개 / 57MB, **체크섬 전량 일치** |
| Git 이력 | `3b31d522` 동일, `git fsck` 이상 없음 |
| DB | `integrity_check: ok` — users 2, submissions 2, review_events 5, sessions 8 |
| 한글 파일명 | NFC 유지, `find`로 정상 매칭 |
| `npm ci` | 1,348 패키지, 14초, 오류 없음 (**네이티브 빌드 없음**) |
| `npm run build` | **SUCCESS** — `build/` 1.3MB, `search-index.json` 42KB 생성 |
| 사이드바 한글 라벨 | 15개 페이지에 정상 출력, 깨진 `?? ??` 0건 |
| API 기동 | `Server listening ... :3100`, `EADDRINUSE` 없음 |
| `/api/health` | `{"ok":true,"service":"dev-wiki-api"}` |
| `/` → `/admin` | 302 리다이렉트 정상, `/admin` 200 |
| 미인증 접근 차단 | `/api/auth/me` 401, 오류 비밀번호 로그인 401 |
| **실제 로그인** | **200** — 세션 발급, `/api/users` 200, `/api/submissions` 200 |
| 위키 서비스 | `/wiki/` 200, `search-index.json` 200, `sitemap.xml` 200 |
| 한글 URL 문서 | 퍼센트 인코딩 시 200 (2건 모두) |

### Node 버전 차이

개발은 Node **24.16.0**, maindev는 **22.23.1**입니다. 이 프로젝트는
`node:sqlite`를 쓰는데, Node 22에서는 아직 실험 기능이라 기동할 때마다
`ExperimentalWarning: SQLite is an experimental feature` 경고가 찍힙니다.
**동작에는 문제가 없음을 실측으로 확인했습니다**(위 표의 DB·로그인 항목).
경고가 신경 쓰이면 Node 24 이상으로 올리면 사라집니다.

### 현재 실행 중인 프로세스 (maindev)

~~두 프로세스는 `nohup`으로 띄워 둔 상태입니다.~~ **이 방식은 2026-09-21에
systemd 사용자 유닛으로 대체되었습니다.** `.llm_api.pid`,
`.wiki_serve.pid` 파일은 삭제했습니다(더 이상 쓰지 않습니다).

```bash
systemctl --user status dev-wiki-api dev-wiki-serve
```

### 2026-09-21 재기동 검증

2026-09-18 09:13 재부팅으로 두 서비스가 모두 내려가 있던 것을 발견해
systemd로 등록하고 다시 띄웠습니다. 아래는 등록 직후 실측입니다.

| 검증 항목 | 결과 |
| --- | --- |
| 유닛 활성화 | `dev-wiki-api`, `dev-wiki-serve` 모두 `enabled` + `active` |
| 부팅 자동 실행 | `Linger=yes`, `default.target.wants`에 심볼릭 링크 2건 |
| 실패 자동 복구 | `Restart=on-failure`, `RestartSec=5s` |
| 리스닝 | 3100(API), 3000(위키) 모두 확인 |
| `/api/health` | `{"ok":true,"service":"dev-wiki-api"}` |
| `/` → `/admin` | 302 리다이렉트, `/admin` 200 |
| 미인증 차단 | `/api/auth/me` 401, 오류 비밀번호 로그인 401 |
| 위키 | `/wiki/` 200, `search-index.json` 200, `sitemap.xml` 200 |
| 테일넷 IP 접근 | `100.100.1.100`의 3000·3100 모두 200 |
| 시크릿 주입 | 기본값 아님 확인 (env 파일 값 주입됨) |
| 발행용 PATH | 프로세스 환경에 `~/.local/bin` 포함, `npm` 확인 |
| 재시작 복구 | `systemctl --user restart` 후 두 서비스 정상 응답 |

---

## 12. 이관 시 변경한 사항

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

## 13. 다음 작업 제안

1. ~~**운영 배포 완성**~~ — systemd 등록과 재부팅 자동 실행은 2026-09-21
   완료. **남은 것은 리버스 프록시뿐입니다.** 80/443에서 `/wiki/`로
   라우팅하고, 그때 API의 `0.0.0.0` 바인딩도 함께 좁히세요(9장 P1).
   maindev에 Caddy도 nginx도 없으므로 프록시 선택부터 해야 합니다.
2. **P1 동기 빌드 해소** — 승인 API를 202 + 상태 폴링으로 전환.
3. **재승인 중복 파일 수정** (P2).
4. **분류기에 실제 LLM 연결** — 현재 키워드 규칙을 LLM 호출로 교체하고,
   `llm_wiki/schema.md`를 프롬프트 컨텍스트로 넣는 방향.
5. **테스트 산출물 정리** (10장) 후 깨끗한 상태에서 실사용 시작.
6. **보안 마감** — `DEV_WIKI_COOKIE_SECRET`, 계정 정리, 첨부 정책.

---

## 14. 참고 문서

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
