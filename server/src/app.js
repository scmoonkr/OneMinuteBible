import express from 'express';
import cors from 'cors';
import authRouter from './modules/auth/auth.routes.js';
import bibleRouter from './modules/bible/bible.routes.js';
import readingRouter from './modules/reading/reading.routes.js';
import reflectionRouter from './modules/reflections/reflection.routes.js';

const app = express();

app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  credentials: true,
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    message: 'OneMinuteBible server is running.',
  });
});

app.use('/api/auth', authRouter);
app.use('/api/bible', bibleRouter);
app.use('/api/reading-paints', readingRouter);
app.use('/api/reflections', reflectionRouter);

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.statusCode || 500).json({
    ok: false,
    message: error.message || 'Internal server error',
  });
});

export default app;
