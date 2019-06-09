import express from 'express';
import datastore from './datastore';
import AuthModule from './auth';
import { GetUsersParms } from './model/GetUsersParms';
const auth = new AuthModule();
const app = express.Router();
export default app;

/**
 * @swagger
 * 
 * /users:
 *   post:
 *     summary: Register new user
 *     description: URegisters a new user
 *     tags: 
 *       - Users
 *     parameters:
 *       - name: username
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         in: formData
 *         required: true
 *         type: string
 *       - name: email
 *         in: formData
 *         type: string
 *     responses:
 *       200:
 *         description: The newly created user, with a token to use for authentication
 *       400:
 *         description: User already exists
 */
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

/**
 * @swagger
 * 
 * /users:
 *   get:
 *     summary: User List
 *     description: User List
 *     tags: 
 *       - Users
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: following
 *         schema:
 *           type: boolean
 *         description: If true, and user is logged in, limits results to 
 *           users followed by the current user
 *       - in: query
 *         name: banned
 *         schema:
 *           type: boolean
 *         description: (Admin only) If specified, limits results to users who are 
 *           banned/unbanned (true/false)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: The page of results to return (default 0)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: The number of results per page (default 50, maximum 50)
 *     responses:
 *       200:
 *         description: returns a list of games matching filters
 */
app.route('/').get(async (req,res,next) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  const params: GetUsersParms = {page,limit};
  if (!req.user || !req.user.isAdmin) params.banned = false;
  else params.banned = req.query.banned;
  if (req.query.following && req.user && req.user.sub) params.followerUserId = req.user.sub;
  //TODO: order by
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

/**
 * @swagger
 * 
 * /users/{id}:
 *   patch:
 *     summary: Modify User (User/Admin only)
 *     description: Updates a user. If a password is provided, 
 *       then the old password must also be provided to prevent impersonation 
 *       with a stolen token.
 *     tags: 
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The user to modify
 *     responses:
 *       200:
 *         description: The updated user
 *       400:
 *         description: Invalid user id
 *       401:
 *         description: Unauthenticated (attempted to modify password without old password)
 *       403:
 *         description: Unauthorized attempt to modify another user
 *       404:
 *         description: User not found
 */
app.route('/:id').patch(async (req,res,next) => {
  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
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

/**
 * @swagger
 * 
 * /users/{id}/follows/{userId}:
 *   put:
 *     summary: Follow User (User/Admin only)
 *     description: Adds a user to your following list. Is idempotent - following the same user again does nothing
 *     tags: 
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The user whose following list is being modified
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The user to follow
 *     responses:
 *       204:
 *         description: Follower added
 *       400:
 *         description: Invalid user id (either one)
 *       401:
 *         description: Unauthenticated (must log in to follow a user)
 *       403:
 *         description: Unauthorized attempt to modify another user's follow list
 *       404:
 *         description: User not found
 */
app.route('/:followerId/follows/:id').put(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);

  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;
  if (isNaN(req.params.followerId)) 
    return res.status(400).send({error:'followerId must be a number'});
  const followerId = req.params.followerId;
  
  if (req.user.sub != followerId) return res.sendStatus(403);

  const targetUser = await datastore.getUser(uid);
  if (!targetUser) return res.sendStatus(404);

  try {
    await datastore.addFollowToUser(uid,req.user.sub);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * 
 * /users/{id}/follows/{userId}:
 *   delete:
 *     summary: Unfollow User (User/Admin only)
 *     description: Removes a user from your following list. Is idempotent - unfollowing the same user again does nothing
 *     tags: 
 *       - Users
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The user whose following list is being modified
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: The user to unfollow
 *     responses:
 *       204:
 *         description: Follower removed
 *       400:
 *         description: Invalid user id (either one)
 *       401:
 *         description: Unauthenticated (must log in to unfollow a user)
 *       403:
 *         description: Unauthorized attempt to modify another user's unfollow list
 *       404:
 *         description: User not found
 */
app.route('/:followerId/follows/:id').delete(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
  
  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;
  if (isNaN(req.params.followerId)) 
    return res.status(400).send({error:'followerId must be a number'});
  const followerId = req.params.followerId;
  
  if (req.user.sub != followerId) return res.sendStatus(403);

  const targetUser = await datastore.getUser(uid);
  if (!targetUser) return res.sendStatus(404);

  try {
    await datastore.removeFollowFromUser(uid,req.user.sub);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});