import express from 'express';
import { Database } from './database';
import datastore from './datastore';
import { resolveTxt } from 'dns';

import AuthModule from './auth';
const auth = new AuthModule();
const app = express.Router();
export default app;

//register
app.route('/').post(async (req,res,next) => {
  try {
    const phash = await auth.hashPassword(req.body.password);
    const user = await datastore.addUser(req.body.username,phash,req.body.email)
    if (!user) res.status(400).send({error:"User Exists"});

    user.token = auth.getToken(user.name,user.id);
    res.send(user);
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
  const user = await datastore.getUser(id);
  if (user == null) res.sendStatus(404);
  else res.send(user);
});

app.route('/:id').patch(async (req,res,next) => {
  var uid = parseInt(req.params.id, 10);
  const database = new Database();
  const isAdmin = false;
  console.log(req.user);
  //if not admin (and if not, uid is not uid in token)
  if (!isAdmin && (!req.user || req.user.sub == null || req.user.sub != uid)) {
    res.status(403).send({error:'unauthorized access to this user'});
    return;
  }

  let params: any[] = [];
  let query = ` UPDATE User SET `;
  if (req.body.password) {
    //verify password and abort if incorrect
    const targetUser = await datastore.getUserForLogin({id:uid});
    const pwVerified = await auth.verifyPassword(targetUser.phash2,req.body.currentPassword);
    if (!pwVerified) {
      res.status(401).send({error:'invalid password'});
      return;
    }
    query += ` phash2 = ?, `;
    const newPassHash = await auth.hashPassword(req.body.password);
    params.push(newPassHash);
  }
  if (req.body.email) {
    query += ` email = ?, `;
    params.push(req.body.email);
  }
  if (isAdmin && req.body.canReport) {
    query += ` can_report = ?, `;
    params.push(req.body.canReport?1:0);
  }
  if (isAdmin && req.body.canSumbit) {
    query += ` can_submit = ?, `;
    params.push(req.body.canSubmit?1:0);
  }
  if (isAdmin && req.body.canReview) {
    query += ` can_review = ?, `;
    params.push(req.body.canReview?1:0);
  }
  if (isAdmin && req.body.canScreenshot) {
    query += ` can_screenshot = ?, `;
    params.push(req.body.canScreenshot?1:0);
  }
  if (isAdmin && req.body.canMessage) {
    query += ` can_message = ?, `;
    params.push(req.body.canMessage?1:0);
  }
  if (req.body.twitchLink) {
    query += ` twitch_link = ?, `;
    params.push(req.body.twitchLink);
  }
  if (req.body.nicoLink) {
    query += ` nico_link = ?, `;
    params.push(req.body.nicoLink);
  }
  if (req.body.youtubeLink) {
    query += ` youtube_link = ?, `;
    params.push(req.body.youtubeLink);
  }
  if (req.body.twitterLink) {
    query += ` twitterLink = ?, `;
    params.push(req.body.twitterLink);
  }
  if (req.body.bio) {
    query += ` bio = ?, `;
    params.push(req.body.bio);
  }
  if (isAdmin && req.body.banned) {
    query += ` banned = ?, `;
    params.push(req.body.banned?1:0);
  }
  if (req.body.locale) {
    query += ` locale = ?, `;
    params.push(req.body.locale?1:0);
  }
  query = query.substring(0, query.length - 2);
  query += ` WHERE id = ?`;
  params.push(uid);

  try {
    const rows = await database.execute(query,params);
    if (rows.affectedRows == 0) res.sendStatus(404);

    const user = await datastore.getUser(uid);
    if (user == null) res.sendStatus(404);
    else res.send(user);
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});
