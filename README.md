# Dev Wiki

Docusaurus 기반 사내 개발팀 Wiki입니다. 개발팀의 기술 지식, 업무 절차, 운영 Runbook, API/아키텍처 문서, 의사결정 기록을 한 곳에 입력하고 정리해 보관하는 것을 목표로 합니다.

## 프로젝트 목표

- 개발 지식과 운영 절차를 문서화해 팀 전체가 같은 기준으로 일하게 합니다.
- 신규 개발자가 빠르게 온보딩할 수 있는 시작점을 제공합니다.
- API, 아키텍처, 배포, 장애 대응, 코딩 표준을 지속적으로 정리합니다.
- 중요한 기술 결정은 `decisions/` 아래 DEC 문서로 남깁니다.
- Git 기반 변경 이력과 리뷰 흐름을 통해 문서 품질을 관리합니다.

## 주요 사용 기술

| 영역 | 기술 | 용도 |
| --- | --- | --- |
| 문서 프레임워크 | Docusaurus v3 | Wiki 스타일 정적 문서 사이트 생성 |
| UI | React | 테마와 MDX 컴포넌트 확장 |
| 문서 형식 | Markdown / MDX | 업무 문서와 개발 문서 작성 |
| 검색 | `@easyops-cn/docusaurus-search-local` | 정적 검색 인덱스 생성 |
| 런타임 | Node.js / npm | 개발 서버, 빌드, 패키지 관리 |
| 배포 산출물 | `build/` | `/wiki/` 하위 경로에서 서비스할 정적 파일 |

## 디렉터리 구조

```text
docs/
  index.md
  development/
    architecture.md
    api.md
  operations/
    deployment.md
  standards/
    coding.md
  decisions/
    DEC-001-docusaurus-wiki.md
src/css/custom.css
docusaurus.config.ts
sidebars.ts
README_DEPLOY.md
```

## 로컬/서버 실행

의존성 설치:

```bash
npm install
```

개발 서버 실행:

```bash
npm run start
```

정적 빌드:

```bash
npm run build
```

빌드 결과는 `build/` 디렉터리에 생성됩니다.

## 현재 서버 실행

현재 서버에서는 다음 경로를 기준으로 실행합니다.

```bash
cd /home/jnh/workspace/dev_wiki
npm run serve -- --port 3000
```

접속 주소:

```text
http://100.83.34.122:3000/wiki/
```

## 운영 계획

1. 문서 카테고리와 소유자를 정합니다.
2. 개발 문서, 운영 문서, 표준 문서, 의사결정 기록을 지속적으로 추가합니다.
3. Pull Request 기반으로 문서 변경을 리뷰합니다.
4. 서버 재부팅 후 자동 실행이 필요하면 `systemd` 서비스로 등록합니다.
5. 80/443 기본 포트에서 `/wiki/`로 서비스하려면 Caddy 또는 Nginx 라우팅을 연결합니다.

## 작성 규칙

- 한 문서는 하나의 명확한 목적을 가집니다.
- 문서 상단에 제목과 설명을 적습니다.
- API 문서는 Endpoint, Auth, Request, Response, Error를 포함합니다.
- 운영 문서는 확인 명령, 복구 절차, 롤백 방법을 포함합니다.
- 기술 결정은 `DEC-xxx-*.md` 형식으로 기록합니다.
