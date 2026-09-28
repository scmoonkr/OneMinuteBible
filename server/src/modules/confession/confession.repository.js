import { getDatabase } from '../../config/db.js';

// 신앙고백·요리문답. 한 문서가 한 문답이고 (book, questionNo) 가 키다.
// node/bible 의 confessionNew 컬렉션을 그대로 복제해 쓴다.
const COLLECTION = 'confessionNew';

// 삭제는 deleted 날짜를 찍는 소프트 삭제라 조회에서 빼야 한다.
const NOT_DELETED = { deleted: { $exists: false } };

function collection() {
  return getDatabase().collection(COLLECTION);
}

export async function findBooks() {
  return collection()
    .aggregate([
      { $match: NOT_DELETED },
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $project: { _id: 0, book: '$_id', count: 1 } },
      { $sort: { book: 1 } },
    ])
    .toArray();
}

export async function findConfessionList(book) {
  return collection()
    .find(
      { book, ...NOT_DELETED },
      {
        projection: {
          _id: 0, book: 1, questionNo: 1, week: 1, title: 1, subject: 1, question: 1,
          // 목록에서는 묵상이 있는지만 알면 되므로 한 요일만 가져온다.
          'contemplation.monday': 1,
        },
        sort: { questionNo: 1 },
      },
    )
    .toArray();
}

export async function findConfession(book, questionNo) {
  return collection().findOne(
    { book, questionNo, ...NOT_DELETED },
    { projection: { _id: 0 } },
  );
}

export async function updateConfession(book, questionNo, fields) {
  const result = await collection().updateOne(
    { book, questionNo, ...NOT_DELETED },
    { $set: { ...fields, updatedAt: new Date() } },
  );
  return result.matchedCount > 0;
}

export async function softDeleteConfession(book, questionNo) {
  const result = await collection().updateOne(
    { book, questionNo, ...NOT_DELETED },
    { $set: { deleted: new Date() } },
  );
  return result.matchedCount > 0;
}
