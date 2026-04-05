3. 나눔 저장 시 DB Action (실제 흐름)
🟢 STEP 1. reflections INSERT
db.reflections.insertOne({
  bookNo,
  chapterNo,
  userNo,
  verseRange,
  paragraphNo,
  rid,
  text,
  verseIDs,
  createdAt,
  updatedAt
})
🔵 STEP 2. 점수 분배 계산
totalScore = 3
perScore = totalScore / verseIDs.length
🟡 STEP 3. verse_topics UPDATE

👉 핵심: verseIDs 기준으로 반복

🔁 반복
for each verse in verseIDs:
📌 UPDATE 구조
db.verse_topics.updateOne(
  {
    bookNo,
    chapterNo,
    verseNo: verse.verseNo,
    mainCategory: verse.category
  },
  {
    $inc: {
      score: perScore,
      recentScore: perScore
    },
    $set: {
      updatedAt: now()
    }
  },
  { upsert: true }
)
🔑 중요한 점

👉 category까지 포함해서 update

창1:26 + 가족
창1:26 + 사랑

→ 서로 다른 topic으로 저장됨
🔴 STEP 4. action_log 저장
db.action_log.insertOne({
  userNo,
  verseNo,
  actionType: "write_reflection",
  createdAt: now()
})
⛔ 중복 방지
조건:
userNo + verseNo + actionType

→ 10분 내 존재하면 skip
⚙️ 4. 전체 실행 흐름 코드
async function writeReflection(data) {
  const {
    userNo,
    bookNo,
    chapterNo,
    verseRange,
    verseIDs,
    text
  } = data

  // 1. reflection 저장
  await db.reflections.insertOne(data)

  const totalScore = 3
  const perScore = totalScore / verseIDs.length

  // 2. verse_topics 업데이트
  for (const v of verseIDs) {

    if (!canUpdate(userNo, v.verseNo)) continue

    await db.verse_topics.updateOne(
      {
        bookNo,
        chapterNo,
        verseNo: v.verseNo,
        mainCategory: v.category
      },
      {
        $inc: {
          score: perScore,
          recentScore: perScore
        },
        $set: {
          updatedAt: new Date()
        }
      },
      { upsert: true }
    )

    // 3. action_log
    await saveActionLog(userNo, v.verseNo)
  }
}
🔥 5. 설계 핵심 (진짜 중요)
1️⃣ “anchor vs 분배” 구조
verseRange → 연결
verseIDs → 점수

👉 역할 완전히 다름

2️⃣ category 단위 분리
같은 구절이라도
주제별로 별도 score

👉 주제 탐색 가능

3️⃣ reflections는 절대 가공하지 않는다
reflections = 원본 데이터

👉 추천 / 분석은 verse_topics에서만

4️⃣ 점수는 write에서만 발생
read ❌
view ❌
write ⭕

👉 “생각한 것만 반영”

🧠 6. 결과적으로 생기는 것
📊 verse_topics
창1:26
- 가족 (score 120)
- 사랑 (score 80)
- 창조 (score 40)
📘 reflections
창1:26 기준 묵상들
→ 서로 연결됨
🚀 7. 한 줄 정리

👉 “묵상은 reflections에 쌓이고
의미는 verse_topics에 쌓인다”