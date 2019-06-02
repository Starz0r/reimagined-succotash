import express from 'express';
import { Database } from './database';
import AuthModule from './auth';
import datastore from './datastore';
import moment = require('moment');

const app = express.Router();
const auth = new AuthModule();
export default app;

/**
 * @swagger
 * 
 * /login:
 *   post:
 *     description: Login
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
app.route('/login').post(async (req,res,next) => {
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
        },true);
        return res.status(401).send({error: 'Invalid Credentials'});
      } else {
        datastore.updateUser({
          id: user.id,
          dateLastLogin:moment().format('YYYY-MM-DD HH:mm:ss'),
          lastIp: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          unsuccessfulLogins:0
        },true);
        user.token = auth.getToken(user.name,user.id,user.isAdmin);
        return res.send(user);
      }
    } finally {
      database.close();
    }
  });
  