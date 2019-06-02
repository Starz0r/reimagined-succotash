import express from 'express';
import datastore from './datastore';
import AuthModule from './auth';
import { GetUsersParms } from './model/GetUsersParms';
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

app.route('/').get(async (req,res,next) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  const params: GetUsersParms = {page,limit};
  if (!req.user || !req.user.isAdmin) params.banned = false;
  if (req.query.following && req.user && req.user.sub) params.followerUserId = req.user.sub;
  try {
    const users = await datastore.getUsers(params);
    users.forEach(u => {delete u.email});
    return res.send(users);
  } catch (err) {
    next(err);
  }
});

app.route('/:uid/lists').get(async (req,res,next) => {
  var userId = parseInt(req.params.uid, 10);
  
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  try {
    const lists = await datastore.getLists({userId,page,limit});
    res.send(lists);
  } catch (err) {
    next(err);
  }
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
  const params: GetUsersParms = {id,page:0,limit:1};
  if (!req.user || !req.user.isAdmin) params.banned = false;

  try {
    const users = await datastore.getUsers(params);
    if (users == null || users.length == 0) res.sendStatus(404);
    const user = users[0];
    if (!req.user || req.user.sub != id) delete user.email;
    res.send(user);
  } catch (err) {
    next(err);
  }
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

app.route('/:id/follow').put(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);

  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;

  const targetUser = await datastore.getUser(uid);
  if (!targetUser) return res.sendStatus(404);

  try {
    await datastore.addFollowToUser(uid,req.user.sub);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/follow').delete(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);

  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;

  const targetUser = await datastore.getUser(uid);
  if (!targetUser) return res.sendStatus(404);

  try {
    await datastore.removeFollowFromUser(uid,req.user.sub);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});