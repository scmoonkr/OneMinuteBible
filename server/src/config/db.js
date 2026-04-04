import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client;
let db;

async function ensureCoreIndexes(database) {
  await Promise.all([
    database.collection('users').createIndexes([
      { key: { userId: 1 }, name: 'users_userId' },
      { key: { email: 1 }, name: 'users_email' },
    ]),
    database.collection('auth_accounts').createIndexes([
      { key: { provider: 1, providerUserId: 1 }, name: 'auth_accounts_provider_user' },
      { key: { email: 1, provider: 1 }, name: 'auth_accounts_email_provider' },
      { key: { userId: 1 }, name: 'auth_accounts_userId' },
    ]),
    database.collection('auth_refresh_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'auth_refresh_tokens_tokenId' },
      { key: { userId: 1 }, name: 'auth_refresh_tokens_userId' },
    ]),
    database.collection('password_reset_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'password_reset_tokens_tokenId' },
      { key: { userId: 1 }, name: 'password_reset_tokens_userId' },
    ]),
    database.collection(env.mongoCollectionBibleEdit).createIndexes([
      { key: { bookNo: 1, chapterNo: 1, verseNo: 1 }, name: 'bible_edit_lookup' },
    ]),
    database.collection('reading_paints').createIndexes([
      {
        key: { userId: 1, bookNo: 1, chapterNo: 1, paragraphNo: 1, verseRange: 1 },
        name: 'reading_paints_lookup',
      },
      { key: { userId: 1, bookNo: 1, chapterNo: 1 }, name: 'reading_paints_chapter' },
    ]),
    database.collection('reflections').createIndexes([
      { key: { userId: 1, bookNo: 1, chapterNo: 1, paragraphNo: 1 }, name: 'reflections_lookup' },
      { key: { userId: 1, bookNo: 1, chapterNo: 1, updatedAt: -1 }, name: 'reflections_recent' },
    ]),
  ]);
}

export async function connectToDatabase() {
  if (db) {
    return db;
  }

  client = new MongoClient(env.mongoUri);
  await client.connect();
  db = client.db(env.mongoDbName);
  await ensureCoreIndexes(db);
  return db;
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database connection has not been initialized.');
  }

  return db;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    db = undefined;
  }
}
