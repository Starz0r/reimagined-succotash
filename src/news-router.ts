import express from 'express';
import AuthModule from './auth';
import datastore from './datastore';
import { News } from './model/News';

const app = express.Router();
const auth = new AuthModule();
export default app;

app.route('/').get(async (req,res,next) => {
  const n = await datastore.getNewses({
    page: +req.query.page || 0,
    limit: +req.query.limit || 50
  });

  if (!n) throw 'news failed to be created';
  return n;
});

app.route('/').post(async (req,res,next) => {
  if (!req.user || !req.user.sub || !req.user.isAdmin) return res.sendStatus(403);
  const uid = req.user.sub;

  const article = req.body as News;

  try {
    const news = await datastore.addNews(article,uid);
    res.send(news);
  } catch (err) {
    next(err);
  }
});