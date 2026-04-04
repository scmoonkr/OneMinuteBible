# 모줄성 프로젝트 작업 지침

## 목적

이 문서는 모줄성 MVP의 구조, 데이터 기준, UX 흐름을 한곳에 모아 기획과 개발에서 공통 참조 문서로 사용하기 위한 문서입니다.

## 상태

- 기준 문서
- 마지막 정리일: 2026-04-03

## 열린 질문

- 12개 대표 카테고리와 MVP용 12개 테마를 어떻게 연결할 것인가?
- `bibleParagraphs`를 그대로 유지할지, 이후 `blocks` 이름으로 전환할지?
- 색칠과 나눔 데이터를 어떤 저장소 구조로 옮길지?

## 1. 핵심 개념

- 모줄성은 한 구절에서 시작해 전체 흐름으로 확장되는 읽기 경험이다.
- 핵심 구조는 `구절 -> 블록 -> 장 -> 책 -> 성경 전체`의 Bottom-up 흐름이다.
- 보조 구조는 `성경 -> 책 -> 장 -> 블록 -> 구절`의 Top-down 흐름이다.
- 두 흐름은 분리되지 않고 하나의 탐색 구조로 연결되어야 한다.

## 2. MVP 구조

- `Book`: 책 정보
- `Chapter`: 장 정보와 장 요약
- `Block`: 의미 단위 중심의 핵심 읽기 단위
- `Verse`: 구절 anchor
- `Reflection`: 사용자의 한 줄 묵상

## 3. 현재 데이터 매핑 기준

- 현재 참조 데이터는 `docs/content/bibles.js`를 기준으로 사용한다.
- `bibles`는 장 메타와 절 데이터를 담는다.
- `bibleParagraphs`는 장별 블록 구조를 담는 MVP 기준 데이터다.
- 현재 데이터에서는 `paragraph == block`으로 해석한다.
- 장의 `subject`는 장 주제다.
- 장의 `excerpt`는 장 요약이다.
- 블록의 `subject`는 블록 주제다.
- 블록의 `summary`는 블록 요약이다.
- 블록 내부 `verses[]`는 실제 읽기 구절 단위다.
- 직접 말씀 구간 표시는 `say: true`를 사용한다.

## 4. 카테고리와 색상 기준

- 대표 분류는 12개 `category`를 사용한다.
- 세부 분류는 각 대표 카테고리를 2개씩 확장한 24개 `categories`를 사용한다.
- 화면 노출은 `colorRainbow`를 사용한다.
- 출판과 PDF 기준 색상은 `color`를 사용한다.
- 카테고리 묶음 라벨은 `category2`를 사용한다.

### 대표 12개 category

- 가족
- 거짓
- 구원
- 계명
- 모범
- 범죄
- 사랑
- 삼위
- 서술
- 섬김
- 예언
- 신앙

## 5. MVP UX 흐름

### Bottom-up 기본 흐름

- 읽기(구절)
- 색칠
- 한 줄 묵상
- 저장
- 생각 나누기

### Top-down 보조 흐름

- 책 선택
- 장 선택
- 블록 선택
- 구절 읽기
- 묵상

## 6. 읽기 화면 기준

- 읽기 화면은 `bibleParagraphs`의 블록 구조를 기준으로 렌더링한다.
- 장 상단에는 장 주제와 장 요약을 보여준다.
- 본문 영역은 블록 단위로 보여준다.
- 각 블록 안에서 구절을 읽고 색과 묵상으로 내려간다.
- `say: true` 구간은 직접 말씀으로 시각적으로 구분한다.
- 정보는 요청 시 노출하고 읽기 흐름을 방해하지 않도록 유지한다.

## 7. Reflection 기준

- 묵상은 구절에서 시작하지만 블록과 장 맥락을 함께 가진다.
- 식별자는 `bookNo`, `chapterNo`, `paragraphNo`, `verseNo`로 통일한다.
- 색칠 상태는 `userId`, `verseRange`, `verseIDs`, `updatedAt` 중심으로 저장한다.
- `verseRange`는 표시용 문자열이고, 형식은 `창1:1,3-4,5`처럼 사용한다.
- `verseIDs`는 처리용 배열이며 예시는 `[1,2,4,5]`이다.
- 나눔 저장은 `bookNo`, `chapterNo`, `paragraphNo`, `verseRange`, `text`, `mine`, `updatedAt` 기준으로 관리한다.
- `blockId` 대신 `paragraphNo`를 사용한다.

## 8. 공유와 제외 범위

- 시스템은 이미지 생성과 문구 생성을 담당한다.
- 사용자는 SNS 업로드를 담당한다.
- MVP에서는 댓글, 좋아요, 랭킹, 복잡한 분석, 강제 온보딩을 제외한다.

## 9. 다음 우선 작업

1. `bibleParagraphs`를 기준으로 블록 중심 읽기 화면을 다듬는다.
2. `bookNo`, `chapterNo`, `paragraphNo`, `verseNo` 기준 저장 구조를 실제 데이터에 맞게 정한다.
3. 색 선택과 한 줄 묵상 저장 루프를 화면에 붙인다.
4. 필요 시 `bibleParagraphs`를 `blocks` 중심 데이터 구조로 재정리한다.

## 10. 참조 파일

- `docs/content/color.js`
- `docs/content/bibles.js`
- `docs/decisions/2026-04-03-data-guidelines.md`
- `docs/decisions/2026-04-03-reading-coloring-guidelines.md`
- `docs/product/project-overview.md`
- `docs/product/ux-service-structure.md`
- `docs/content/content-strategy.md`
- `docs/wireframes/app-wireframe.md`
