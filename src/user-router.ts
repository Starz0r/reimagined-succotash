import express from 'express';
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
    if (!user) return res.status(400).send({error:"User Exists"});

    user.token = auth.getToken(user.name,user.id,user.isAdmin);
    res.send(user);
  } catch (err) {
    next(err);
  }
});

app.route('/:uid/lists').get(async (req,res,next) => {
  var userId = parseInt(req.params.uid, 10);
  
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  const lists = await datastore.getLists({userId,page,limit});
  res.send(lists);
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
  const isAdmin = false;
  //if not admin (and if not, uid is not uid in token)
  if (!isAdmin && (!req.user || req.user.sub == null || req.user.sub != uid)) {
    res.status(403).send({error:'unauthorized access to this user'});
    return;
  }

  let user = req.body;
  user.id = uid;

  if (req.body.password) {
    //verify password and abort if incorrect
    const targetUser = await datastore.getUserForLogin({id:uid});
    const pwVerified = await auth.verifyPassword(targetUser.phash2,req.body.currentPassword);
    if (!pwVerified) {
      res.status(401).send({error:'invalid password'});
      return;
    }
    const newPassHash = await auth.hashPassword(req.body.password);
    user.phash2 = newPassHash;
  }

  try {
    const success = await datastore.updateUser(user,isAdmin);
    if (!success) {
      res.sendStatus(404);
      return;
    }

    const newUser = await datastore.getUser(uid);
    if (newUser == null) res.sendStatus(404);
    else res.send(newUser);
  } catch (err) {
    next(err);
  }
});