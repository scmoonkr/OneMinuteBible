import { getDatabase } from '../../config/db.js';

const COLLECTION_NAME = 'reflections';

export async function listReflections(query = {}) {
  const database = getDatabase();

  return database
    .collection(COLLECTION_NAME)
    .find(query, {
      sort: { updatedAt: -1 },
      projection: { _id: 0 },
    })
    .toArray();
}

export async function insertReflection(document) {
  const database = getDatabase();
  await database.collection(COLLECTION_NAME).insertOne(document);
  return document;
}
