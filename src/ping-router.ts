import express from 'express';

const app = express.Router();
export default app;

app.route('/').get((req,res,next) => {
  res.send('pong')
});
  