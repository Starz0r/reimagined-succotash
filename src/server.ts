import express, { RequestHandler, ErrorRequestHandler } from 'express';
import bodyParser from 'body-parser';
import uuid from 'uuid/v4';

import jwt_middleware from 'express-jwt';
//import jwt from 'jsonwebtoken';

import config from './config/config';
import game_router from './game-router';
import user_router from './user-router';
import review_router from './review-router';
import list_router from './list-router';
import login_router from './login-router';
import ping_router from './ping-router';

import { Database } from './database';
Database.init();

const app = express();
app.use(function (req,res,next) {
  console.log(req.originalUrl);
  next();
});

app.use(bodyParser.json({type:"*/*"}));

app.use(jwt_middleware({
  secret: config.app_jwt_secret,
  credentialsRequired: false
}));

const c: RequestHandler = (req,res,next) => {
  if (req.user) { 
    req.user.roles = ['game_update'];
  }
  next();
}
app.use(c);

//if !req.user throw error if required
/*app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      error: 'Authorization Required - please visit /login'
    });
  } else {
    next(err);
  }
});*/

const e: ErrorRequestHandler = (err,req,res,next) => {
  const id = uuid();
  console.log(`severe error: id ${id}`);
  console.log(err);
  res.status(500).send({
    error: "Internal Server Error",
    id: id
  });
}
app.use(e);

app.use('/api/games',game_router);
app.use('/api/users',user_router);
app.use('/api/reviews',review_router);
app.use('/api/lists',list_router);
app.use('/api/login',login_router);
app.use('/api/ping',ping_router);

app.listen(config.app_port,  () => {
  console.log('Server started at localhost:4201!');
});
