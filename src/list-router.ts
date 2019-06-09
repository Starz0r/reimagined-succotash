import express from 'express';
import datastore from './datastore';
import handle from './lib/express-async-catch';
import { userCheck } from './lib/auth-check';

const app = express.Router();
export default app;

app.route('/').post(userCheck(), handle(async (req, res, next) => {
  const list = await datastore.addList(req.body, req.user.sub);
  res.send(list);
}));

app.route('/:listId/games').put(userCheck(), handle(async (req, res, next) => {
  const gid = req.body.gameId;
  const lid = parseInt(req.params.listId, 10);

  const list = await datastore.getList(lid);
  if (!list) return res.sendStatus(404);

  if (list.userId !== req.user.sub) return res.sendStatus(403);

  const games = await datastore.getListGames(lid);
  if (games.includes(gid)) return res.sendStatus(204);

  await datastore.addGameToList(lid,gid);
  return res.sendStatus(204);
}));