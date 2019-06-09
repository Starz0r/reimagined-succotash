import express from 'express';
import datastore from './datastore';
import { News } from './model/News';
import handle from './lib/express-async-catch';
import { adminCheck } from './lib/auth-check';

const app = express.Router();
export default app;

app.route('/').get(handle(async (req,res,next) => {  
  const n = await datastore.getNewses({
    page: +req.query.page || 0,
    limit: +req.query.limit || 50
  });

  return res.send(n);
}));

app.route('/:id').get(handle(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  const n = await datastore.getNewses({id: +req.params.id, page: 0, limit: 1});
  if (!n || n.length == 0) return res.sendStatus(404);
  return res.send(n[0]);
}));

app.route('/').post(adminCheck(), handle(async (req,res,next) => {
  const uid = req.user.sub;

  const article = req.body as News;

  const news = await datastore.addNews(article,uid);
  res.send(news);
}));