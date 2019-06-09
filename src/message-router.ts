import express from 'express';
import { Database } from './database';
import InsertList from './lib/insert-list';
import WhereList from './lib/where-list';
import { Message } from './model/Message';
import { MessageQueryParams } from './model/MessageQueryParams';
import handle from './lib/express-async-catch';

const app = express.Router();
export default app;

app.route('/inbox').get(handle(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
    
  let parms = {} as MessageQueryParams;
  parms.userToId = req.user.sub; //force to for inbox

  const whereList = new WhereList();
  whereList.add("user_to_id",parms.userToId);

  const database = new Database();
  try {
    const messages = await database.query(`
      SELECT *, thread_id as threadId
      FROM Message 
      ${whereList.getClause()}`,whereList.getParams());
    return res.send(messages);
  } finally {
    database.close();
  }
}));

app.route('/thread/:id').get(handle(async (req,res,next) => {
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
  } finally {
    database.close();
  }
}));
  
app.route('/').post(handle(async (req,res,next) => {
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
    } else {
      let replyTo = await database.query(`
        SELECT thread_id FROM Message WHERE id = ?`,result.replyToId);
      if (replyTo.length != 1) {
        
      }
      result = await database.execute(`
        UPDATE Message SET thread_id = ? WHERE id = ?`,[replyTo[0].thread_id, result.insertId]);
      if (result.affectedRows != 1) throw 'Wonky database error!';
    }

    return res.sendStatus(204);
  } finally {
    database.close();
  }
}));
