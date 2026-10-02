import { env } from '../../config/env.js';
import { getDatabase } from '../../config/db.js';
import { escapeRegExp } from '../../utils/validation.js';

const MAX_LIMIT = 500;

function buildQuery(params = {}) {
  const query = {};

  if (params.bookNo !== undefined) query.bookNo = Number(params.bookNo);
  if (params.book !== undefined) query.book = String(params.book).trim();
  if (params.bookENG) {
    const book = String(params.bookENG).trim();
    query.bookENG = book.slice(0, 1).toUpperCase() + book.slice(1).toLowerCase();
  }
  if (params.chapterNo !== undefined) query.chapterNo = Number(params.chapterNo);
  if (params.verseNo !== undefined) query.verseNo = Number(params.verseNo);
  if (params.content) {
    const content = String(params.content).trim();
    if (content) {
      query.content = new RegExp(escapeRegExp(content), 'i');
    }
  }

  return query;
}

export async function findBibleRows(params = {}) {
  const database = getDatabase();
  const query = buildQuery(params);
  
  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(query, {
      projection: { _id: 0 },
      sort: { bookNo: 1, chapterNo: 1, verseNo: 1 },
      limit: MAX_LIMIT,
    })
    .toArray();

  return rows;
}

export async function findBibleChaptersByBookNo(bookNo) {
  const database = getDatabase();

  const rows = await database
    .collection(env.mongoCollectionBibleEdit)
    .find(
      {
        bookNo: Number(bookNo),
        verseNo: 1,
      },
      {
        projection: { _id: 0, bookNo: 1, chapterNo: 1, subject: 1 },
        sort: { chapterNo: 1 },
      },
    )
    .toArray();

  return rows;
}

// 편집 화면용: 한 장의 원본 행(verseNo 0 = 장 정보, 1.. = 절)을 그대로 읽는다.
export async function findBibleEditRows(bookNo, chapterNo) {
  return getDatabase()
    .collection(env.mongoCollectionBibleEdit)
    .find(
      { bookNo, chapterNo },
      { projection: { _id: 0, bookNo: 1, chapterNo: 1, verseNo: 1, subject: 1, excerpt: 1, verses: 1 }, sort: { verseNo: 1 } },
    )
    .toArray();
}

// 편집 화면 저장. 행을 지우고 다시 넣지 않고, 절마다 편집 필드만 고친다.
// 빈 문자열인 subject/excerpt 는 필드를 지운다(원래 없던 것과 같게).
// 장 정보(verseNo 0) 행은 없는 장도 있어서 없으면 만든다. 절 행은 새로 만들지 않는다.
export async function updateBibleEditRows(bookNo, chapterNo, { info, rows }, index0) {
  const operations = [];

  const fieldUpdate = (fields) => {
    const $set = {};
    const $unset = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      if (value === '') $unset[key] = '';
      else $set[key] = value;
    }
    const update = {};
    if (Object.keys($set).length) update.$set = $set;
    if (Object.keys($unset).length) update.$unset = $unset;
    return update;
  };

  if (info) {
    const update = fieldUpdate({ subject: info.subject, excerpt: info.excerpt });
    update.$setOnInsert = { bookNo, chapterNo, verseNo: 0, index: index0 };
    operations.push({ updateOne: { filter: { bookNo, chapterNo, verseNo: 0 }, update, upsert: true } });
  }

  for (const row of rows ?? []) {
    const update = fieldUpdate({ subject: row.subject, excerpt: row.excerpt, verses: row.verses });
    if (!Object.keys(update).length) continue;
    operations.push({ updateOne: { filter: { bookNo, chapterNo, verseNo: row.verseNo }, update } });
  }

  if (!operations.length) return { matched: 0, modified: 0 };

  const result = await getDatabase()
    .collection(env.mongoCollectionBibleEdit)
    .bulkWrite(operations, { ordered: true });

  return { matched: result.matchedCount + result.upsertedCount, modified: result.modifiedCount + result.upsertedCount };
}

// 한 장의 biblehub 원문 문서 전체 (영문 요약·단락·기도·토론 질문 등).
export async function findBiblehubDocument(bookNo, chapterNo) {
  return getDatabase().collection('biblehub').findOne(
    { bookNo, chapterNo },
    { projection: { _id: 0 } },
  );
}

// 단락 나누기를 통째로 바꾼다 (editHub 저장).
// 1) 절 행의 subject/excerpt 를 모두 지우고 2) 새 단락 시작 절에만 다시 넣는다.
// 장 정보(verseNo 0)는 없으면 만들고, 절 행은 새로 만들지 않는다.
export async function replaceBibleParagraphs(bookNo, chapterNo, { info, paragraphs }, index0) {
  const collection = getDatabase().collection(env.mongoCollectionBibleEdit);
  const operations = [
    {
      updateMany: {
        filter: { bookNo, chapterNo, verseNo: { $gt: 0 } },
        update: { $unset: { subject: '', excerpt: '' } },
      },
    },
    ...paragraphs.map((p) => ({
      updateOne: {
        filter: { bookNo, chapterNo, verseNo: p.verseNo },
        update: { $set: p.excerpt ? { subject: p.subject, excerpt: p.excerpt } : { subject: p.subject } },
      },
    })),
  ];

  if (info) {
    const $set = {};
    if (info.subject) $set.subject = info.subject;
    if (info.excerpt) $set.excerpt = info.excerpt;
    if (Object.keys($set).length) {
      operations.push({
        updateOne: {
          filter: { bookNo, chapterNo, verseNo: 0 },
          update: { $set, $setOnInsert: { bookNo, chapterNo, verseNo: 0, index: index0 } },
          upsert: true,
        },
      });
    }
  }

  return collection.bulkWrite(operations, { ordered: true });
}

// 위치(bookNo, chapterNo, verseNo)마다 subject/excerpt 만 바꾼다. 여러 장에 걸쳐도 된다.
// 단락 나누기 전체를 바꾸지 않으므로 다른 절의 subject 는 그대로 둔다.
// 장 정보(verseNo 0) 행은 없으면 만들고, 절 행은 새로 만들지 않는다(호출 전에 존재를 확인한다).
export async function updateVerseExcerpts(items, index0Of) {
  if (!items.length) return { matched: 0, modified: 0 };

  const operations = items.map((item) => {
    const $set = {};
    if (item.subject !== undefined) $set.subject = item.subject;
    if (item.excerpt !== undefined) $set.excerpt = item.excerpt;
    const filter = { bookNo: item.bookNo, chapterNo: item.chapterNo, verseNo: item.verseNo };

    if (item.verseNo === 0) {
      return {
        updateOne: {
          filter,
          update: { $set, $setOnInsert: { ...filter, index: index0Of(item) } },
          upsert: true,
        },
      };
    }
    return { updateOne: { filter, update: { $set } } };
  });

  const result = await getDatabase()
    .collection(env.mongoCollectionBibleEdit)
    .bulkWrite(operations, { ordered: false });

  return { matched: result.matchedCount + result.upsertedCount, modified: result.modifiedCount + result.upsertedCount };
}

// 주어진 위치들 중 실제로 있는 절 행을 돌려준다. ("bookNo:chapterNo:verseNo" 집합)
export async function findExistingVerseKeys(positions) {
  if (!positions.length) return new Set();

  // 장마다 한 조건으로 묶는다: { bookNo, chapterNo, verseNo: { $in: [...] } }
  const byChapter = new Map();
  for (const p of positions) {
    const key = `${p.bookNo}:${p.chapterNo}`;
    if (!byChapter.has(key)) byChapter.set(key, { bookNo: p.bookNo, chapterNo: p.chapterNo, verseNos: [] });
    byChapter.get(key).verseNos.push(p.verseNo);
  }

  const rows = await getDatabase()
    .collection(env.mongoCollectionBibleEdit)
    .find(
      { $or: [...byChapter.values()].map((c) => ({ bookNo: c.bookNo, chapterNo: c.chapterNo, verseNo: { $in: c.verseNos } })) },
      { projection: { _id: 0, bookNo: 1, chapterNo: 1, verseNo: 1 } },
    )
    .toArray();
  return new Set(rows.map((r) => `${r.bookNo}:${r.chapterNo}:${r.verseNo}`));
}

export async function findExistingVerseNos(bookNo, chapterNo) {
  const rows = await getDatabase()
    .collection(env.mongoCollectionBibleEdit)
    .find({ bookNo, chapterNo, verseNo: { $gt: 0 } }, { projection: { _id: 0, verseNo: 1 } })
    .toArray();
  return new Set(rows.map((r) => r.verseNo));
}

export async function setChapterAudio(bookNo, chapterNo, audio, index0) {
  await getDatabase().collection(env.mongoCollectionBibleEdit).updateOne(
    { bookNo, chapterNo, verseNo: 0 },
    { $set: { audio }, $setOnInsert: { bookNo, chapterNo, verseNo: 0, index: index0 } },
    { upsert: true },
  );
}

// biblehub 컬렉션에서 장 단위 부가정보(인물·장소·사건)를 읽는다.
// 세 필드 모두 [{ title, link, key }] 형태이고 link 는 biblehub 의 /topical/... 경로다.
export async function findBiblehubChapter(bookNo, chapterNo) {
  const database = getDatabase();

  return database.collection('biblehub').findOne(
    { bookNo: Number(bookNo), chapterNo: Number(chapterNo) },
    { projection: { _id: 0, bookNo: 1, chapterNo: 1, people: 1, place: 1, events: 1 } },
  );
}

// biblehubSlug 로 공개된 글을 찾는다. 한 slug 에 글이 여럿일 수 있다.
export async function findPostsByBiblehubSlugs(slugs = []) {
  if (!slugs.length) return [];

  const database = getDatabase();

  return database.collection('contents')
    .find(
      {
        biblehubSlug: { $in: slugs },
        contentType: 'post',
        status: 'published',
        visibility: 'public',
        isDeleted: { $ne: true },
      },
      { projection: { _id: 0, slug: 1, title: 1, biblehubSlug: 1, publishedAt: 1 } },
    )
    .sort({ publishedAt: -1 })
    .toArray();
}

export async function findVerseTopicsByCategory(categoryNames = [], options = {}) {
  const database = getDatabase();
  const names = Array.from(new Set(categoryNames.filter(Boolean).map((item) => String(item).trim())));

  if (!names.length) {
    return [];
  }

  const cursor = database
    .collection(env.mongoCollectionVerseTopics)
    .find(
      {
        mainCategory: { $in: names },
      },
      {
        projection: {
          _id: 0,
          verseId: 1,
          bookNo: 1,
          chapterNo: 1,
          verseNo: 1,
          mainCategory: 1,
          subCategories: 1,
          baseWeight: 1,
          score: 1,
          recentScore: 1,
          isAnchor: 1,
        },
      },
    );

  if (options.sort) {
    cursor.sort(options.sort);
  }

  if (Number.isInteger(options.limit) && options.limit > 0) {
    cursor.limit(options.limit);
  }

  return cursor.toArray();
}

export async function findRecentVerseTopicAction({
  userNo,
  verseId,
  mainCategory,
  actionType,
  cutoffIso,
}) {
  const database = getDatabase();
  const query = {
    userNo: Number(userNo),
    verseId: String(verseId),
    actionType: String(actionType),
    createdAt: { $gte: cutoffIso },
  };

  if (mainCategory !== undefined && mainCategory !== null && String(mainCategory).trim()) {
    query.mainCategory = String(mainCategory).trim();
  }

  return database.collection('action_log').findOne(
    query,
    {
      projection: { _id: 1 },
    },
  );
}

export async function saveVerseTopicAction(document) {
  const database = getDatabase();
  await database.collection('action_log').insertOne(document);
}

export async function incrementVerseTopicScore({
  verseId,
  bookNo,
  chapterNo,
  verseNo,
  mainCategory,
  scoreDelta,
}) {
  const database = getDatabase();

  await database.collection(env.mongoCollectionVerseTopics).updateOne(
    {
      bookNo: Number(bookNo),
      chapterNo: Number(chapterNo),
      verseNo: Number(verseNo),
      mainCategory: String(mainCategory),
    },
    {
      $set: {
        verseId: String(verseId),
      },
      $setOnInsert: {
        bookNo: Number(bookNo),
        chapterNo: Number(chapterNo),
        verseNo: Number(verseNo),
        mainCategory: String(mainCategory),
        baseWeight: 0,
        isAnchor: false,
        subCategories: [],
      },
      $inc: {
        score: Number(scoreDelta),
        recentScore: Number(scoreDelta),
      },
    },
    { upsert: true },
  );
}
