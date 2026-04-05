import { MongoClient } from 'mongodb';
import { env } from './env.js';

let client;
let db;

async function ensureCoreIndexes(database) {
  await Promise.all([
    database.collection('users').createIndexes([
      { key: { userId: 1 }, name: 'users_userId' },
      { key: { userNo: 1 }, name: 'users_userNo' },
      { key: { email: 1 }, name: 'users_email' },
      { key: { nickname: 1 }, name: 'users_nickname' },
    ]),
    database.collection('auth_accounts').createIndexes([
      { key: { provider: 1, providerUserId: 1 }, name: 'auth_accounts_provider_user' },
      { key: { email: 1, provider: 1 }, name: 'auth_accounts_email_provider' },
      { key: { userId: 1 }, name: 'auth_accounts_userId' },
      { key: { userNo: 1 }, name: 'auth_accounts_userNo' },
    ]),
    database.collection('auth_refresh_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'auth_refresh_tokens_tokenId' },
      { key: { userId: 1 }, name: 'auth_refresh_tokens_userId' },
      { key: { userNo: 1 }, name: 'auth_refresh_tokens_userNo' },
    ]),
    database.collection('password_reset_tokens').createIndexes([
      { key: { tokenId: 1 }, name: 'password_reset_tokens_tokenId' },
      { key: { userId: 1 }, name: 'password_reset_tokens_userId' },
    ]),
    database.collection(env.mongoCollectionBibleEdit).createIndexes([
      { key: { bookNo: 1, chapterNo: 1, verseNo: 1 }, name: 'bible_edit_lookup' },
    ]),
    database.collection(env.mongoCollectionVerseTopics).createIndexes([
      { key: { mainCategory: 1, baseWeight: -1, score: -1, recentScore: -1 }, name: 'verse_topics_mainCategory' },
      { key: { verseId: 1 }, name: 'verse_topics_verseId' },
    ]),
    database.collection('reflections').createIndexes([
      { key: { userNo: 1, bookNo: 1, chapterNo: 1, verseRange: 1 }, name: 'reflections_unique_userNo' },
      { key: { bookNo: 1, chapterNo: 1, updatedAt: -1 }, name: 'reflections_recent_userNo' },
    ]),
    database.collection('verse_topic_actions').createIndexes([
      {
        key: { userNo: 1, actionType: 1, bookNo: 1, chapterNo: 1, verseNo: 1, mainCategory: 1, createdAt: -1 },
        name: 'verse_topic_actions_recent_lookup',
      },
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
