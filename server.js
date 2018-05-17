const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');

const jwt_middleware = require('express-jwt');
const jwt = require('jsonwebtoken');

const config = require('./config');
const game_router = require('./game-router');
const user_router = require('./user-router');
const review_router = require('./review-router');
const list_router = require('./list-router');
const login_router = require('./login-router');

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

app.use(function (err,req,res,next) {
  if (req.user) {
    req.user.roles = ['game_update'];
  }
  next();
});

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

app.use(function (err, req, res, next) {
  const id = uuid();
  console.log('severe');
  console.log(err);
  res.status(500).send({
    error: "Internal Server Error",
    id: id
  });
});

app.use('/api/games',game_router);
app.use('/api/users',user_router);
app.use('/api/reviews',review_router);
app.use('/api/lists',list_router);
app.use('/api/login',login_router);

app.listen(config.app_port,  () => {
  console.log('Server started at localhost:4201!');
});
