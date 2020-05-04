import express from 'express';
import datastore from './datastore';
import AuthModule from './lib/auth';
import { GetUsersParms } from './model/GetUsersParms';
import handle from './lib/express-async-catch';
import { userCheck } from './lib/auth-check';
const auth = new AuthModule();
const app = express.Router();
export default app;

/**
 * @swagger
 * 
 * /users:
 *   post:
 *     summary: Register new user
 *     description: Registers a new user
 *     tags: 
 *       - Users
 *     requestBody:
 *       description: The user to create
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username: 
 *                 type: string
 *               password: 
 *                 type: string
 *               email: 
 *                 type: string
 *     responses:
 *       200:
 *         description: The newly created user, with a token to use for authentication
 *       400:
 *         description: Malformed request, or user already exists
 */
app.route('/').post(handle(async (req,res,next) => {
  if (!req.is('application/json')) return res.status(400).send('Invalid request: expected a JSON body of the format {"username":"example","password":"example","email":"example@example.com"}');
  if (!req.body.username) return res.status(400).send("invalid request: missing 'username' in request body");
  if (!req.body.password) return res.status(400).send("invalid request: missing 'password' in request body");

  const phash = await auth.hashPassword(req.body.password);
  const user = await datastore.addUser(req.body.username,phash,req.body.email)
  if (!user) return res.status(400).send({error:"User Exists",code:1});

  datastore.addReport({
    type:"user_register",
    targetId:""+user.id,
    report:"User Registered"
  },user.id);

  user.token = auth.getToken(user.name,user.id,user.isAdmin);
  res.send(user);
}));

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
app.route('/').get(handle(async (req,res,next) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  const params: GetUsersParms = {page,limit};
  if (!req.user || !req.user.isAdmin) params.banned = false;
  else params.banned = req.query.banned;
  if (req.query.following && req.user && req.user.sub) params.followerUserId = req.user.sub;
  //TODO: order by
  const users = await datastore.getUsers(params);
  users.forEach(u => {
    delete u.email;
    delete u.canReport;
    delete u.canSubmit;
    delete u.canReview;
    delete u.canScreenshot;
    delete u.banned;
  });
  return res.send(users);
}));

app.route('/:uid/lists').get(handle(async (req,res,next) => {
  var userId = parseInt(req.params.uid, 10);
  
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  const lists = await datastore.getLists({userId,page,limit});
  res.send(lists);
}));

app.route('/:id/reviews').get(handle(async (req,res,next) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  const rows = await datastore.getReviews({user_id:id,removed:false,page:page,limit:limit});
  res.send(rows);
}));

app.route('/:id').get(handle(async (req,res,next) => {
  var id = parseInt(req.params.id, 10);
  const params: GetUsersParms = {id,page:0,limit:1};
  if (!req.user || !req.user.isAdmin) params.banned = false;

  const users = await datastore.getUsers(params);
  if (users == null || users.length == 0) res.sendStatus(404);
  const user = users[0];
  if (user && (!req.user || req.user.sub != id)) {
    delete user.email;
    delete user.canReport;
    delete user.canSubmit;
    delete user.canReview;
    delete user.canScreenshot;
    delete user.banned;
  }
  res.send(user);
}));

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
app.route('/:id').patch(userCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  var uid = parseInt(req.params.id, 10);
  
  const isAdmin = false;
  //if not admin (and if not, uid is not uid in token)
  if (!isAdmin && req.user.sub != uid) {
    return res.status(403).send({error:'unauthorized access to this user'});
  }

  let user = req.body;
  user.id = uid;

  if (req.body.password) {
    //verify password and abort if incorrect
    const targetUser = await datastore.getUserForLogin({id:uid});
    const pwVerified = await auth.verifyPassword(targetUser.phash2,req.body.currentPassword);
    if (!pwVerified) {
      return res.sendStatus(401);
    }
    const newPassHash = await auth.hashPassword(req.body.password);
    user.phash2 = newPassHash;
  }

  if (!req.user.isAdmin) {
    delete user.canReport;
    delete user.canSubmit;
    delete user.canReview;
    delete user.canScreenshot;
    delete user.banned;
    delete user.unsuccessfulLogins;
    delete user.lastIp;
    delete user.dateLastLogin;
  }

  const success = await datastore.updateUser(user);
  if (!success) {
    return res.sendStatus(404);
  }

  const newUser = await datastore.getUser(uid);
  if (newUser == null) return res.sendStatus(404);
  else res.send(newUser);
}));

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
app.route('/:followerId/follows/:id').put(userCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;
  if (isNaN(+req.params.followerId)) 
    return res.status(400).send({error:'followerId must be a number'});
  const followerId = req.params.followerId;
  
  if (req.user.sub != followerId) return res.sendStatus(403);

  const targetUser = await datastore.getUser(+uid);
  if (!targetUser) return res.sendStatus(404);

  await datastore.addFollowToUser(+uid,req.user.sub);
  return res.sendStatus(204);
}));

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
app.route('/:followerId/follows/:id').delete(userCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const uid = req.params.id;
  if (isNaN(+req.params.followerId)) 
    return res.status(400).send({error:'followerId must be a number'});
  const followerId = req.params.followerId;
  
  if (req.user.sub != followerId) return res.sendStatus(403);

  const targetUser = await datastore.getUser(+uid);
  if (!targetUser) return res.sendStatus(404);

  await datastore.removeFollowFromUser(+uid,req.user.sub);
  return res.sendStatus(204);
}));