# 문서 구조

이 디렉터리는 OneMinuteBible 프로젝트의 기획, 콘텐츠, 화면 설계를 정리하는 공간입니다.

## 개발 실행 방법

프로젝트 루트(`OneMinuteBible`) 기준으로 실행합니다.

### 1. 의존성 설치

```bash
pnpm run install:all
```

### 2. 서버 실행

```bash
pnpm run dev:server
```

- 내부적으로 `server` 디렉터리의 `pnpm run dev`를 실행합니다.
- 기본 포트는 `3001`입니다.
- 서버는 루트 `.env` 파일을 읽습니다.
- MongoDB 연결 정보가 필요하면 `.env`에 `MONGODB_URI` 또는 `MONGODB_ADDR`를 설정합니다.

### 3. 웹 실행

```bash
pnpm run dev:web
```

- 내부적으로 `apps/web` 디렉터리의 `pnpm run dev`를 실행합니다.
- Nuxt 개발 서버는 보통 `http://localhost:3000`에서 확인할 수 있습니다.

### 4. 함께 실행할 때

터미널을 2개 열어서 각각 실행합니다.

```bash
pnpm run dev:server
pnpm run dev:web
```

## Git 업로드 / 다운로드

프로젝트 루트(`OneMinuteBible`) 기준으로 실행합니다.

### 1. 원격 변경사항 내려받기

```bash
git pull origin main
```

### 2. 내 변경사항 올리기

```bash
git status
git add .
git commit -m "작업 내용 적기"
git push origin main
```

### 3. 처음 저장소를 내려받을 때

```bash
git clone <저장소주소>
cd OneMinuteBible
```

## 폴더 안내

- `product/`: 서비스 방향, 기능 구조, UX 원칙
- `content/`: 콘텐츠 전략, 톤앤매너, 발행 아이디어
- `wireframes/`: 화면 흐름, 와이어프레임, 사용자 플로우
- `decisions/`: 최종 확정된 의사결정 기록

## 현재 문서

- `product/project-overview.md`: 프로젝트 전체 방향과 핵심 가설
- `product/ux-service-structure.md`: UX 원칙과 서비스 구조
- `content/content-strategy.md`: SNS/블로그 중심 콘텐츠 전략
- `wireframes/app-wireframe.md`: 화면 흐름과 와이어프레임 초안

## 운영 원칙

1. 초안성 메모는 관련 폴더에 두고, 최종 결정은 반드시 `decisions/`에 분리합니다.
2. 하나의 문서에는 하나의 역할만 담습니다. 제품 기획, 콘텐츠 기획, 화면 설계를 섞지 않습니다.
3. 구현에 영향을 주는 변경이 생기면 기존 문서를 덮어쓰기보다 결정 문서를 추가합니다.
4. 문서 상단에는 가능하면 목적, 상태, 마지막 수정일을 적어 둡니다.

## 추천 다음 단계

- 각 문서 상단에 `목적`, `상태`, `열린 질문` 섹션 추가
- 확정 사항이 생길 때마다 `decisions/YYYY-MM-DD-*.md` 형식으로 기록
