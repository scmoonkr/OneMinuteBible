# 모줄성 데이터 기준 결정

## 목적

모줄성 MVP의 데이터 구조와 읽기 화면 기준을 구현용 규칙으로 고정하기 위한 문서.

## 상태

- 확정
- 결정일: 2026-04-03

## 결정 요약

- MVP의 핵심 읽기 단위는 `Block`이다.
- 현재 데이터에서는 `bibleParagraphs.paragraphs[]`를 `Block`으로 사용한다.
- `Verse`는 anchor 역할을 하며 묵상과 나눔 연결 기준이 된다.
- 장의 `subject`는 장 주제, `excerpt`는 장 요약으로 사용한다.
- 블록의 `subject`는 블록 주제, `summary`는 블록 요약으로 사용한다.
- 화면 색상은 `colorRainbow`, 출판 색상은 `color`를 사용한다.
- 직접 말씀 표시는 `say: true`를 사용한다.
- 식별자는 `bookNo`, `chapterNo`, `paragraphNo`, `verseNo`로 통일한다.

## 1. MVP 구조

### Book

- `bookNo`
- `name`
- `order`

### Chapter

- `bookNo`
- `chapterNo`
- `subject`
- `excerpt`

### Block

- `bookNo`
- `chapterNo`
- `paragraphNo`
- `startVerse`
- `endVerse`
- `subject`
- `summary`

### Verse

- `bookNo`
- `chapterNo`
- `paragraphNo`
- `verseNo`
- `text`

### Reflection

- `userId`
- `bookNo`
- `chapterNo`
- `paragraphNo`
- `verseRange`
- `text`
- `mine`
- `updatedAt`

### Painted Categories

- `userId`
- `verseRange`
- `verseIDs`
- `updatedAt`

## 2. 현재 참조 데이터 매핑

- `bibles`: 장 메타와 절 데이터
- `verseNo: 0`: 장 메타 엔트리
- `bibleParagraphs`: 장별 블록 구조
- `paragraphs[]`: 현재 MVP의 `Block`
- `paragraphNo`: 현재 MVP에서 블록 번호
- `paragraph.subject`: 블록 주제
- `paragraph.summary`: 블록 요약
- `paragraph.verses[]`: 블록 내부 Verse 목록
- `segment.verseNo`: verse anchor 번호
- `segment.say`: 직접 말씀 여부

## 3. 탐색 구조

### Bottom-up 기본 흐름

- 구절 -> 블록 -> 장 -> 책 -> 성경 전체

### Top-down 보조 흐름

- 성경 -> 책 -> 장 -> 블록 -> 구절

## 4. 읽기 화면 규칙

- 장 상단에는 `chapter.subject`, `chapter.excerpt`를 노출한다.
- 본문은 블록 단위로 렌더링한다.
- 각 블록 카드에는 `paragraph.subject`, `paragraph.summary`, `paragraph.verses`를 노출한다.
- 각 Verse는 `category` 기준으로 색을 입힌다.
- `say: true`는 직접 말씀으로 강조한다.
- 묵상은 구절에서 시작하되 블록 맥락 안에서 작성한다.
- 저장 시 식별자는 `bookNo`, `chapterNo`, `paragraphNo`, `verseNo`를 사용한다.

## 5. 카테고리와 테마

- 대표 분류는 기존 12개 `category`를 유지한다.
- UI는 `category -> colorRainbow`를 사용한다.
- 출판/PDF는 `category -> color`를 사용한다.
- MVP 테마 선택 UI는 별도 12개 테마 체계로 갈 수 있으나, 우선은 대표 `category`와의 연결 규칙이 필요하다.

## 6. 나눔과 저장 규칙

- 나눔 구조는 `verseRange` 기준으로 저장한다.
- 색칠 상태는 `userId`, `verseRange`, `verseIDs`, `updatedAt`를 저장한다.
- `verseRange` 인덱스 형식은 `창1:1,3-4,5`를 사용한다.
- `verseIDs`는 실제 처리용 배열이며 예시는 `[1,2,4,5]`이다.
- Reflection은 `bookNo`, `chapterNo`, `paragraphNo`, `verseRange`, `text`, `mine`, `updatedAt`를 저장한다.
- 공유 구조는 시스템이 이미지/문구를 만들고, 사용자가 SNS에 업로드하는 방식으로 유지한다.

## 7. 초기 적용 범위

- 초기 참조 본문 범위는 창세기 1~3장
- 이 데이터로 블록 읽기, 색 선택, 한 줄 묵상 루프를 검증한다.

## 참조 파일

- `docs/content/color.js`
- `docs/content/bibles.js`
- `agent.md`
