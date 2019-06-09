import express from 'express';
import handle from './lib/express-async-catch';

const app = express.Router();
export default app;

app.route('/').get(handle(async (req,res,next) => {
  res.send('pong')
}));

app.route('/error').get(handle(async (req,res,next) => {
  return await new Promise((res,rej) => {
    rej('oops');
  });
}));
app.route('/error2').get(handle(async (req,res,next) => {
  return await new Promise((res,rej) => {
    throw 'oops'
  });
}));
  