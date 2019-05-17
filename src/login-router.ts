import express from 'express';
import { Database } from './database';
import AuthModule from './auth';

const app = express.Router();
const auth = new AuthModule();
export default app;

app.route('/').post(async (req,res,next) => {
    const username = req.body.username;
    const password = req.body.password;
    
    const database = new Database();
    try {
      const users = await database.query('SELECT id,name,phash2 FROM User WHERE name = ?',[username]);
      if (users.length == 0) {
        res.status(401).send({error: 'Invalid Credentials'});
      }
      const user = users[0];

      const verified = await auth.verifyPassword(user.phash2,password)
          
      if (!verified) {
        res.status(401).send({error: 'Invalid Credentials'});
      } else {
        user.token = auth.getToken(user.name,user.id);
        res.send(user);
      }
    } finally {
      database.close();
    }
  });
  