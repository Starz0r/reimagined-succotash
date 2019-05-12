import express from 'express';
import { Database } from './database';
import datastore from './datastore';

const app = express.Router();
export default app;

//register
app.route('/').post(async (req,res,next) => {
  try {
    const success = await datastore.addUser(req.body.username,req.body.password,req.body.email)
    if (success) res.send({message:"Registration Successful"});
    else res.status(400).send({error:"User Exists"});
  } catch (err) {
    next(err);
  }
});

app.route('/:uid/games/:gid/lists').get((req,res,next) => {
  var uid = parseInt(req.params.uid, 10);
  var gid = parseInt(req.params.gid, 10);

  datastore.getLists(uid,gid)
    .then(rows => res.send(rows))
    .catch(err => next(err));
});

app.route('/:id/reviews').get((req,res,next) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  datastore.getReviews({user_id:id,page:page,limit:limit})
  .then(rows => res.send(rows))
  .catch(err => next(err));
});

app.route('/:id').get(async (req,res,next) => {
  var id = parseInt(req.params.id, 10);
  const database = new Database();
  const isAdmin = false;
  const removedClause = isAdmin?'':'AND banned = 0';
  const query = `
    SELECT u.id, u.name, u.date_created
         , u.twitch_link, u.youtube_link
         , u.nico_link, u.twitter_link
         , u.bio
    FROM User u 
    WHERE u.id = ? ${removedClause}
  `;
  try {
    const rows = await database.query(query,[id]);
    if (rows.length == 0) res.sendStatus(404);
    else res.send(rows[0]);
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});
