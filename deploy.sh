#!/usr/bin/env bash
# 운영 서버 배포: pull → install → build → pm2 재시작 → API 확인
#
#   API        1min-bible-api        127.0.0.1:7710  (루트 .env 의 PORT)
#   Web        1min-bible-client     :7711
#   Dashboard  1min-bible-dashboard  :7712
#
# 웹·대시보드의 /api 는 Nitro 프록시가 NUXT_API_PROXY_TARGET(7710)으로 넘긴다.
set -euo pipefail

# 저장소 루트 (이 스크립트 위치)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

API_PORT=7710
API_TARGET="http://127.0.0.1:${API_PORT}"
# 연결된 글(/post/:slug) 링크에 쓰는 사이트 주소 (대시보드용)
PUBLIC_BASE="https://oneminutebible.co.kr"
# 웹의 성경 API 주소. 비워 두면 브라우저·SSR 모두 웹과 같은 주소의 /api 를 부르고
# 웹의 Nitro 프록시가 서버 안에서 API_TARGET 으로 넘긴다.
# http://<공인IP>:7710 처럼 API 포트를 직접 쓰면 페이지 이동(브라우저 요청) 때
# 방화벽·https 혼합 콘텐츠 차단으로 "Failed to fetch" 가 난다. (F5 의 SSR 만 됨)
WEB_API_BASE=""
# 대시보드 주소. 웹 로그인 후 이 주소로 돌아올 수 있다 (/login?redirect=).
DASHBOARD_BASE="https://dashboard.oneminutebible.co.kr"
# 로그인 쿠키(omb-*) 도메인. 웹과 대시보드(dashboard.*)가 로그인을 함께 쓴다.
COOKIE_DOMAIN=".oneminutebible.co.kr"

echo "=== [1/6] git pull origin main ==="
git pull origin main

echo "=== [2/6] pnpm install ==="
pnpm install --frozen-lockfile

echo "=== [3/6] build:server ==="
pnpm run build:server

echo "=== [4/6] build:web ==="
pnpm run build:web

echo "=== [5/6] build:dashboard ==="
pnpm run build:dashboard

echo "=== [6/6] restart PM2 ==="
# pm2 start/restart 공통: 있으면 환경변수를 새로 넣어 재시작, 없으면 새로 띄운다.
pm2_up() {
  local name="$1" script="$2" cwd="$3"
  if pm2 describe "$name" >/dev/null 2>&1; then
    pm2 restart "$name" --update-env
  else
    pm2 start "$script" --name "$name" --cwd "$cwd" --update-env
  fi
}

# API (Express). 포트는 루트 .env 의 PORT 를 쓴다.
PORT=$API_PORT pm2_up 1min-bible-api "$PROJECT_DIR/server/dist/index.js" "$PROJECT_DIR"

# Web (Nuxt)
PORT=7711 HOST=0.0.0.0 \
NUXT_PUBLIC_API_BASE="$WEB_API_BASE" \
NUXT_API_PROXY_TARGET="$API_TARGET" \
NUXT_PUBLIC_COOKIE_DOMAIN="$COOKIE_DOMAIN" \
NUXT_PUBLIC_DASHBOARD_BASE="$DASHBOARD_BASE" \
  pm2_up 1min-bible-client "$PROJECT_DIR/apps/web/.output/server/index.mjs" "$PROJECT_DIR/apps/web"

# Dashboard (Nuxt)
PORT=7712 HOST=0.0.0.0 \
NUXT_API_PROXY_TARGET="$API_TARGET" \
NUXT_PUBLIC_WEB_BASE="$PUBLIC_BASE" \
NUXT_PUBLIC_COOKIE_DOMAIN="$COOKIE_DOMAIN" \
  pm2_up 1min-bible-dashboard "$PROJECT_DIR/apps/dashboard/.output/server/index.mjs" "$PROJECT_DIR/apps/dashboard"

pm2 save

echo "=== API 확인 (${API_TARGET}/health) ==="
# API 는 MongoDB 연결에 성공한 뒤에야 포트를 연다. 최대 30초 기다린다.
for i in $(seq 1 30); do
  if curl -fsS "${API_TARGET}/health" >/dev/null 2>&1; then
    echo "API OK"
    exit 0
  fi
  sleep 1
done

echo "!! API 가 ${API_PORT} 에서 응답하지 않습니다. 최근 로그:"
pm2 logs 1min-bible-api --lines 40 --nostream
exit 1
