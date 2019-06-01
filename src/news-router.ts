import express from 'express';
import AuthModule from './auth';
import datastore from './datastore';
import { News } from './model/News';

const app = express.Router();
const auth = new AuthModule();
export default app;

app.route('/').get(async (req,res,next) => {  
  try {
    const n = await datastore.getNewses({
      page: +req.query.page || 0,
      limit: +req.query.limit || 50
    });

    return res.send(n);
  } catch (err) {
    next(err);
  }
});

app.route('/:id').get(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  try {
    const n = await datastore.getNewses({
      id: +req.params.id,
      page: +req.query.page || 0,
      limit: +req.query.limit || 1
    });
    if (!n || n.length == 0) return res.sendStatus(404);
    return res.send(n[0]);
  } catch (err) {
    next(err);
  }
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