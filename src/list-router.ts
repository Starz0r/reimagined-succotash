import express from 'express';
import { Database } from './database';
import datastore from './datastore';

const app = express.Router();
export default app;

app.route('/').post(async (req, res, next) => {
  if (!req.user) return res.sendStatus(401);

  try {
    const list = await datastore.addList(req.body, req.user.sub);
    res.send(list);
  } catch (err) {
    next(err);
  }
});

app.route('/:listId').post(async (req, res, next) => {
  const uid = req.body.userId;
  const gid = req.body.gameId;
  const value = req.body.value;
  const lid = parseInt(req.params.listId, 10);

  if (!req.user || req.user.sub == null || req.user.sub != uid) {
    res.status(403).send({ error: 'user cannot update this list' });
    return;
  }

  const database = new Database();
  try {
    if (!value) {
      await database.execute(`
          DELETE FROM lists 
          WHERE user_id=? AND game_id=? AND list_id=?
        `, [uid, gid, lid])
      return await datastore.getLists(uid, gid);
    } else {
      await database.execute(`
          INSERT INTO lists 
          (user_id,game_id,list_id)
          VALUES (?,?,?)
        `, [uid, gid, lid])
      return await datastore.getLists(uid, gid);
    }
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});