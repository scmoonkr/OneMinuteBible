# OneMinuteBible

OneMinuteBible 프로젝트 실행 및 Git 작업 메모입니다.

## 준비

```bash
pnpm install
pnpm run install:all
```

환경 변수는 루트의 `.env.example`을 참고해서 `.env`에 설정합니다.

## 실행 방법

서버 실행:

```bash
pnpm run dev:server
```

웹 실행:

```bash
pnpm run dev:web
pnpm run dev:dashboard
```

기본 개발 주소:

- Web: `http://localhost:7711`
- Dashboard: `http://localhost:7712`
- Server: `http://localhost:7710`

웹·대시보드의 `/api` 요청은 Nitro 프록시가 `NUXT_API_PROXY_TARGET`(기본 `http://127.0.0.1:7710`)으로 넘깁니다.

## 배포

운영 서버에서는 저장소 루트의 `deploy.sh`를 실행합니다.

```bash
bash deploy.sh
```

pull → `pnpm install` → 빌드 → pm2 재시작 → API 응답 확인 순서로 진행합니다.

| pm2 이름 | 역할 | 포트 |
|---|---|---|
| `1min-bible-api` | API (Express) | 7710 (루트 `.env` 의 `PORT`) |
| `1min-bible-client` | Web (Nuxt) | 7711 |
| `1min-bible-dashboard` | Dashboard (Nuxt) | 7712 |

- 웹의 성경 API 주소(`NUXT_PUBLIC_API_BASE`)는 **비워 둡니다**. 그러면 브라우저와 SSR 모두 웹과 같은 주소의 `/api`를 부르고, 웹의 Nitro 프록시가 서버 안에서 7710으로 넘깁니다. `deploy.sh`가 빈 값으로 넘깁니다.
  - `http://<공인IP>:7710`처럼 API 포트를 직접 쓰면, F5(서버 렌더링)는 되지만 페이지 이동(브라우저 요청) 때 방화벽이나 https 혼합 콘텐츠 차단으로 `Failed to fetch`가 납니다.
  - 이 값은 빌드할 때 결과물에 박히고, 실행할 때 환경변수로 덮어쓸 수 있습니다. 빌드할 때도 서버의 `apps/web/.env` 등에 넣지 마세요.
- 루트 `.env`는 API 서버만 읽습니다. 빌드된 웹·대시보드는 읽지 않습니다.
- `MONGODB_ADDR`도 같은 서버의 MongoDB라면 공인 IP 대신 `127.0.0.1:<port>`를 씁니다.

## 빌드

서버 빌드:

```bash
pnpm run build:server
```

웹 빌드:

```bash
pnpm run build:web
```

전체 빌드:

```bash
pnpm run build:all
```

## Git Pull

원격 저장소의 최신 내용을 가져올 때:

```bash
git pull origin main
```

## Git Push

변경 파일 확인:

```bash
git status
```

변경 파일 추가:

```bash
git add .
```

커밋 생성:

```bash
git commit -m "작업 내용 요약"
```

원격 저장소에 올리기:

```bash
git push origin main
```
