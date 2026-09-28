import {
  getBibleEdit, getBiblehubChapter, getBibleChapter, getChapterAudioPath, listBibleChapters, listTopicVerses,
  recordTopicVerseAction, saveBibleEdit } from './bible.service.js';

export async function readBibleEdit(req, res, next) {
  try {
    return res.json({ ok: true, data: await getBibleEdit(req.params) });
  } catch (error) {
    return next(error);
  }
}

export async function updateBibleEdit(req, res, next) {
  try {
    return res.json({ ok: true, data: await saveBibleEdit(req.params, req.body) });
  } catch (error) {
    return next(error);
  }
}

export function readChapterAudio(req, res, next) {
  try {
    const file = getChapterAudioPath(req.params);

    if (!file) {
      return res.status(404).json({ ok: false, message: 'Audio not found.' });
    }

    // sendFile 이 Range 요청을 처리하므로 재생 위치 이동(seek)이 된다.
    return res.sendFile(file, { maxAge: '7d' });
  } catch (error) {
    return next(error);
  }
}

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


export async function readBookChapters(req, res, next) {
  try {
    const chapters = await listBibleChapters(req.query);

    return res.json({
      ok: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readTopicVerses(req, res, next) {
  try {
    const verses = await listTopicVerses(req.query);

    return res.json({
      ok: true,
      count: verses.length,
      data: verses,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateTopicVerseAction(req, res, next) {
  try {
    const result = await recordTopicVerseAction(req.body);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function readBiblehubChapter(req, res, next) {
  try {
    return res.json({ ok: true, data: await getBiblehubChapter(req.query) });
  } catch (error) {
    return next(error);
  }
}
