---
title: 배포 Runbook
description: Dev Wiki 빌드와 /wiki 경로 배포 방법
---

# 배포 Runbook

Dev Wiki는 Docusaurus 정적 사이트로 빌드한 뒤 `/wiki/` 경로에서 서비스합니다.

## 빌드

```bash
cd ~/workspace/dev_wiki
npm run build
```

빌드 결과는 `build/` 디렉터리에 생성됩니다.

## 임시 실행

```bash
npm run serve -- --port 3000
```

접속 주소:

```text
http://100.100.1.100:3000/wiki/
```

## 서비스 경로

- 목표 URL: `http://100.100.1.100/wiki/`
- 현재 테스트 URL: `http://100.100.1.100:3000/wiki/`
- Docusaurus `baseUrl`: `/wiki/`

## Nginx 설정 예시

```nginx
location /wiki/ {
    alias /home/sam/workspace/dev_wiki/build/;
    try_files $uri $uri/ /wiki/index.html;
}
```

## 검증

- `/wiki/` 접속 가능 여부
- 정적 자산 로딩 여부
- 검색 인덱스 로딩 여부
- 새로고침 시 404 발생 여부
