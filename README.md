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
```

기본 개발 주소:

- Web: `http://localhost:7711`
- Server: `http://localhost:3001`

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
