import express from 'express';
import { Database } from './database';
import datastore from './datastore';
import { resolveTxt } from 'dns';

import AuthModule from './auth';
import UpdateList from './update-list';
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
  //if not admin (and if not, uid is not uid in token)
  if (!isAdmin && (!req.user || req.user.sub == null || req.user.sub != uid)) {
    res.status(403).send({error:'unauthorized access to this user'});
    return;
  }

  const updateList = new UpdateList();

  if (req.body.password) {
    //verify password and abort if incorrect
    const targetUser = await datastore.getUserForLogin({id:uid});
    const pwVerified = await auth.verifyPassword(targetUser.phash2,req.body.currentPassword);
    if (!pwVerified) {
      res.status(401).send({error:'invalid password'});
      return;
    }
    const newPassHash = await auth.hashPassword(req.body.password);
    updateList.add('phash2',newPassHash);
  }
  updateList.add('email',req.body.email);
  updateList.addIf('can_report',req.body.canReport,isAdmin);
  updateList.addIf('can_submit',req.body.canSubmit,isAdmin);
  updateList.addIf('can_review',req.body.canReview,isAdmin);
  updateList.addIf('can_screenshot',req.body.canScreenshot,isAdmin);
  updateList.add('twitch_link',req.body.twitchLink);
  updateList.add('nico_link',req.body.nicoLink);
  updateList.add('youtube_link',req.body.youtubeLink);
  updateList.add('twitterLink',req.body.twitterLink);
  updateList.add('bio',req.body.bio);
  updateList.addIf('banned',req.body.banned,isAdmin);
  updateList.add('locale',req.body.locale);

  try {
    let params = updateList.getParams();
    params.push(uid);
    const rows = await database.execute(
      ` UPDATE User ${updateList.getSetClause()} WHERE id = ?`,params);
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