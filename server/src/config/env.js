import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootEnvPath = path.resolve(__dirname, '../../../.env');

dotenv.config({ path: rootEnvPath });


const port = Number(process.env.PORT || process.env.APP_PORT || 7710);
const mongoHost = process.env.MONGODB_ADDR || '127.0.0.1:27017';
const mongoDbName = process.env.MONGODB_DB || 'OneMinuteBible';
const mongoCollectionBibleEdit =
  process.env.MONGODB_COLLECTION_BIBLE_EDIT || 'Bibles';
const mongoCollectionVerseTopics =
  process.env.MONGODB_COLLECTION_VERSE_TOPICS || 'verse_topics';

const mongoUsername = process.env.MONGO_USERNAME || '';
const mongoPassword = process.env.MONGO_PWD || '';
const mongoAuthSource = process.env.MONGODB_AUTH_SOURCE || '';
const mongoDirectConnection = process.env.MONGODB_DIRECT_CONNECTION || '';
const encodedUsername = encodeURIComponent(mongoUsername);
const encodedPassword = encodeURIComponent(mongoPassword);
const mongoAuthPart =
  encodedUsername && encodedPassword ? `${encodedUsername}:${encodedPassword}@` : '';

const mongoParams = new URLSearchParams();

if (mongoAuthSource) {
  mongoParams.set('authSource', mongoAuthSource);
}

if (mongoDirectConnection) {
  mongoParams.set('directConnection', mongoDirectConnection);
}

const mongoQueryString = mongoParams.toString();
const mongoUri =
  process.env.MONGODB_URI ||
  `mongodb://${mongoAuthPart}${mongoHost}/${mongoDbName}${
    mongoQueryString ? `?${mongoQueryString}` : ''
  }`;

// 장별 낭독 mp3: <dir>/<english 책이름>/<장>.mp3 (node/bible 의 uploadPath/bible 과 같은 구조)
const bibleAudioDir = process.env.BIBLE_AUDIO_DIR || '/backup/ImageBible/bible';

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'dev-access-secret';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret';
const kakaoClientId = process.env.KAKAO_ID || process.env.KAKAO_CLIENT_ID || '';
const kakaoRedirectUri =
  process.env.KAKAO_REDIRECT_URI || 'http://localhost:3000/auth/kakao/callback';

export const env = {
  port,
  mongoUri,
  mongoDbName,
  mongoCollectionBibleEdit,
  mongoCollectionVerseTopics,
  bibleAudioDir,
  jwtAccessSecret,
  jwtRefreshSecret,
  kakaoClientId,
  kakaoRedirectUri,
};

