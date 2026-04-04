import { getBibleChapter } from './bible.service.js';

export async function readChapter(req, res, next) {
  try {
    const { chapter, rows } = await getBibleChapter(req.query);

    if (!chapter) {
      return res.status(404).json({
        ok: false,
        message: 'Chapter not found.',
      });
    }

    return res.json({
      ok: true,
      count: rows.length,
      data: chapter,
    });
  } catch (error) {
    return next(error);
  }
}
