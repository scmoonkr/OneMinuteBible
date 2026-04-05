# Verse Topics Update Algorithm (write_reflection)

## 🎯 목적
사용자가 나눔(묵상)을 저장할 때  
선택한 성경 구절들에 점수를 분배하여 추천 시스템에 반영한다.

---

## 📦 입력 데이터

- verseIds: 선택된 구절 배열  
  예: ["창1:1", "창1:2", "창1:4", "창1:5"]

- userId: 사용자 ID

- actionType: "write_reflection"

---
## 'reflections' collection
{
    "bookNo" : 1,
    "chapterNo" : 1,
    "userNo" : 7,
    "verseRange" : "창1:26",
    "createdAt" : "2026-04-05T09:23:05.385Z",
    "nickname" : "chanceMoon",
    "paragraphNo" : 8,
    "rid" : "r_1775381088674_l5eqhzlq",
    "text" : "하나님의 형상을 따라 우리를 만드셨다는 크신 뜻, 너무 하찮게 다룬게 아닌지...",
    "updatedAt" : "2026-04-05T09:24:48.674Z",
    "verseIDs" : [ 
        {
            "verseNo" : 26,
            "category" : "가족",
            "verse" : "하나님이 가라사대",
            "godSay" : false
        }, 
    ]
}

## "verse_topics" collection
{
    "verseId" : "창2:24",
    "bookNo" : 1.0,
    "chapterNo" : 2.0,
    "verseNo" : 24.0,
    "mainCategory" : "가족",
    "baseWeight" : 10.0,
    "score" : 0.0,
    "recentScore" : 0.0,
    "isAnchor" : true
}

## 🧠 핵심 원칙

1. 전체 점수는 고정 (write = 3)
2. 선택된 절 수만큼 나누어 분배
3. 모든 절에 동일하게 적용
4. recentScore도 동일하게 증가
5. 중복 이벤트는 제한 (10분)

---

## ⚙️ 알고리즘

### 1. 점수 계산

totalScore = 3  
perScore = totalScore / verseIds.length

---

### 2. 점수 업데이트

for each verseId in verseIds:

    verse.score += perScore  
    verse.recentScore += perScore  

    save(verse)

---

### 3. 중복 방지

조건:
- 동일 userId
- 동일 verseId
- 동일 actionType
- 10분 이내

→ update 차단

---

## 💻 코드 예시

```javascript
function handleWriteReflection(userId, verseIds) {
  const totalScore = 3
  const perScore = totalScore / verseIds.length

  for (const verseId of verseIds) {
    if (!canUpdate(userId, verseId, "write_reflection")) continue

    const verse = findVerse(verseId)

    verse.score += perScore
    verse.recentScore += perScore

    saveVerse(verse)
    saveActionLog(userId, verseId, "write_reflection")
  }
}
```

---

## ⛔ 주의사항

- read 이벤트는 점수에 포함하지 않는다
- view_reflection과 write_reflection을 동시에 처리하지 않는다
- 점수를 조회 시 계산하지 않는다 (저장 시 누적)

---

## 🔥 핵심 요약

- write_reflection = 여러 절 → 점수 분배  
- score = 누적 가치  
- recentScore = 최근 반응  
- 추천은 finalWeight로 결정  

---

## 💡 한 줄 정리

👉 “묵상은 나누고, 점수도 나눈다”
