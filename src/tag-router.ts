import express from 'express';
import datastore from './datastore';

import handle from './lib/express-async-catch';
import { userCheck } from './lib/auth-check';

const app = express.Router();
export default app;

app.route('/').post(userCheck(), handle(async (req,res,next) => {
  const tag = await datastore.createTag(req.body.name);
  res.send(tag);
}));

app.route('/').get(handle(async (req,res,next) => {
  const tagId = +req.query.tag_id||undefined
  const userId = +req.query.user_id||undefined
  const q = req.query.q||undefined

  const rows = await datastore.getTags(tagId,q);
  res.send(rows);
}));
