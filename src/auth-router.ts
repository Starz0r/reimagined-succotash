import express from 'express';
import { Database } from './database';
import AuthModule from './lib/auth';
import datastore from './datastore';
import moment = require('moment');
import crypto from 'crypto';
import handle from './lib/express-async-catch';
import { userCheck } from './lib/auth-check';

const app = express.Router();
const auth = new AuthModule();
export default app;

/**
 * @swagger
 * 
 * /auth/login:
 *   post:
 *     summary: Login
 *     description: Login
 *     tags: 
 *       - Authentication
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         in: formData
 *         required: true
 *         type: string
 *       - name: password
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       200:
 *         description: logged in
 *       401:
 *         description: username/password invalid
 * 
 */
app.route('/login').post(handle(async (req,res,next) => {
    const username = req.body.username;
    const password = req.body.password;
    
    const database = new Database();
    try {
      const users = await database.query('SELECT id,name,phash2,is_admin as isAdmin FROM User WHERE name = ?',[username]);
      if (users.length == 0) {
        res.status(401).send({error: 'Invalid Credentials'});
      }
      const user = users[0];
      const verified = await auth.verifyPassword(user.phash2,password)
          
      if (!verified) {
        const u = await datastore.getUser(user.id);
        datastore.updateUser({
          id: user.id,
          unsuccessfulLogins: u.unsuccessfulLogins+1
        });
        return res.status(401).send({error: 'Invalid Credentials'});
      } else {
        datastore.updateUser({
          id: user.id,
          dateLastLogin:moment().format('YYYY-MM-DD HH:mm:ss'),
          lastIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          unsuccessfulLogins:0
        });
        user.token = auth.getToken(user.name,user.id,user.isAdmin);
        return res.send(user);
      }
    } finally {
      database.close();
    }
}));
  
/**
 * @swagger
 * 
 * /auth/reset-request:
 *   post:
 *     summary: Request Password Reset
 *     description: Request Password Reset
 *     tags: 
 *       - Authentication
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: username
 *         in: formData
 *         required: true
 *         type: string
 *     responses:
 *       204:
 *         description: request accepted
 *       400:
 *         description: invalid username or username missing
 * 
 */
app.route('/request-reset').post(handle(async (req,res,next) => {
  const username = req.body.username;
  if (!username) return res.sendStatus(400);

  const token = crypto.randomBytes(128).toString('hex');

  const database = new Database();
  try {
    await database.execute(
      `UPDATE User SET reset_token = ?, reset_token_set_time = CURRENT_TIMESTAMP
      WHERE name = ? AND `,[token,username]);
    res.sendStatus(204);
  } finally {
    database.close();
  }
}));

/**
 * @swagger
 * 
 * /auth/refresh:
 *   post:
 *     summary: Refresh Token
 *     description: Allows a user with a valid token to request a fresh token
 *                  with a new expiration date.
 *     tags: 
 *       - Authentication
 *     produces:
 *       - application/json
 *     responses:
 *       200:
 *         description: Latest user data with fresh token
 *       401:
 *         description: Unauthorized (Not logged in or token expired)
 * 
 */
app.route('/refresh').post(userCheck(), handle(async (req,res,next) => {
  const user = await datastore.getUser(req.user.sub);
  if (!user) return res.sendStatus(401);
  user.token = auth.getToken(user.name,user.id,user.isAdmin);
  return res.send(user);
}));