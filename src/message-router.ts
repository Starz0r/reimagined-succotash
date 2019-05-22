import express from 'express';
import { Database } from './database';
import AuthModule from './auth';
import InsertList from './lib/insert-list';
import WhereList from './lib/where-list';

const app = express.Router();
const auth = new AuthModule();
export default app;

export interface Message {
  id?: number;
  isRead?: boolean;
  userFromId?: number;
  userToId?: number;
  subject?: string;
  body?: string;
  dateCreated?: string;
  deleted?: boolean;

  replyToId?: number;
  threadId?: number;
}

export interface MessageQueryParams {
  userToId?: number;
  threadId?: number;
}

app.route('/inbox').get(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
    
  let parms = {} as MessageQueryParams;
  parms.userToId = req.user.sub; //force to for inbox

  const whereList = new WhereList();
  whereList.add("user_to_id",parms.userToId);

  const database = new Database();
  try {
    const messages = await database.query(`
      SELECT *
      FROM Message 
      ${whereList.getClause()}`,whereList.getParams());
    return res.send(messages);
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});

app.route('/thread/:id').get(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
    
  let parms = {} as MessageQueryParams;
  parms.threadId = req.params.id;

  const whereList = new WhereList();
  whereList.add("thread_id",parms.threadId);
  //don't allow viewing a thread if you're not one of the participants
  whereList.addPhrase("user_to_id = ? OR user_from_id = ?",req.user.sub,req.user.sub);

  const database = new Database();
  try {
    const messages = await database.query(`
      SELECT *
      FROM Message 
      ${whereList.getClause()}`,whereList.getParams());
    return res.send(messages);
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});
  
app.route('/').post(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);

  const msg = req.body as Message;

  const insertList = new InsertList();
  insertList.add("user_from_id",req.user.sub);
  insertList.add("user_to_id",msg.userToId);
  insertList.add("subject",msg.subject);
  insertList.add("body",msg.body);
  insertList.add("reply_to_id",msg.replyToId);
    
  const database = new Database();
  try {
    let result = await database.execute(`
      INSERT INTO Message ${insertList.getClause()}`,insertList.getParams());
    if (!msg.replyToId) { //new thread
      result = await database.execute(`
        UPDATE Message SET thread_id = id WHERE id = ?`,result.insertId);
      if (result.affectedRows != 1) throw 'Wonky database error!';
    }

    return res.sendStatus(204);
  } catch (err) {
    next(err);
  } finally {
    database.close();
  }
});
