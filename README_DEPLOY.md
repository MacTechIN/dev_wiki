# Dev Wiki 배포 안내

## 기본 정보

- 프로젝트 경로: `/home/jnh/workspace/dev_wiki`
- 빌드 산출물: `/home/jnh/workspace/dev_wiki/build`
- 현재 테스트 접속 주소: `http://100.83.34.122:3000/wiki/`
- 목표 서비스 경로: `http://100.83.34.122/wiki/` 또는 `https://100.83.34.122/wiki/`
- Docusaurus `baseUrl`: `/wiki/`

## 빌드

```bash
cd /home/jnh/workspace/dev_wiki
npm run build
```

## 임시 실행

```bash
cd /home/jnh/workspace/dev_wiki
npm run serve -- --port 3000
```

## Caddy 라우팅 예시

기존 Caddy 설정에서 catch-all 라우트보다 앞에 다음 블록을 둡니다.

```caddyfile
redir /wiki /wiki/ 308
handle_path /wiki/* {
    root * /home/jnh/workspace/dev_wiki/build
    try_files {path} /index.html
    file_server
}
```

설정 검증:

```bash
sudo caddy validate --config /etc/dgo/Caddyfile.dev --adapter caddyfile
sudo caddy reload --config /etc/dgo/Caddyfile.dev --adapter caddyfile
```

## 검증

```bash
curl -I http://127.0.0.1:3000/wiki/
curl -I http://127.0.0.1:3000/wiki/search-index.json
curl -I http://127.0.0.1:3000/wiki/sitemap.xml
```
