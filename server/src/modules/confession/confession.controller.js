import {
  deleteConfession, getConfession, listBooks, listConfessions, saveConfession,
} from './confession.service.js';

export async function readBooks(req, res, next) {
  try {
    const books = await listBooks();
    return res.json({ ok: true, count: books.length, data: books });
  } catch (error) {
    return next(error);
  }
}

export async function readConfessionList(req, res, next) {
  try {
    const rows = await listConfessions(req.query);
    return res.json({ ok: true, count: rows.length, data: rows });
  } catch (error) {
    return next(error);
  }
}

export async function readConfession(req, res, next) {
  try {
    return res.json({ ok: true, data: await getConfession(req.params) });
  } catch (error) {
    return next(error);
  }
}

export async function updateConfession(req, res, next) {
  try {
    return res.json({ ok: true, data: await saveConfession(req.params, req.body) });
  } catch (error) {
    return next(error);
  }
}

export async function removeConfession(req, res, next) {
  try {
    return res.json({ ok: true, data: await deleteConfession(req.params) });
  } catch (error) {
    return next(error);
  }
}
