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
import auth_router from './auth-router';
import ping_router from './ping-router';
import message_router from './message-router';
import screenshot_router from './screenshot-router';
import news_router from './news-router';
import report_router from './report-router';

import { Database } from './database';

console.log('Welcome to delfruit server 2.0!');

Database.init();

console.log('Initializing express...');

const app = express();
/*app.use(function (req,res,next) {
  console.log(req.originalUrl);
  next();
});*/

app.use(bodyParser.json({type:"application/json"}));

console.log('Initializing jwt middleware...');

app.use(jwt_middleware({
  secret: config.app_jwt_secret,
  credentialsRequired: false
}));

console.log('Initializing role middleware...');

app.use((req,res,next) => {
  if (req.user) { 
    req.user.roles = ['game_update'];
  }
  next();
});

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

console.log('Initializing routers...');

app.use('/api/games',game_router);
app.use('/api/users',user_router);
app.use('/api/reviews',review_router);
app.use('/api/lists',list_router);
app.use('/api/auth',auth_router);
app.use('/api/ping',ping_router);
app.use('/api/message',message_router);
app.use('/api/screenshots',screenshot_router);
app.use('/api/news',news_router);
app.use('/api/reports',report_router);

console.log('Initializing swagger...');

import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  swaggerDefinition: {
    // Like the one described here: https://swagger.io/specification/#infoObject
    info: {
      title: 'Delicious Fruit API',
      version: '2.0.0',
      description: 'The API you should use instead of throwing your monitor out the window',
    },
  },
  apis: [__dirname+'/*.ts'],
  basePath: '/api/',
};

const specs = swaggerJsdoc(options);
import swaggerUi from 'swagger-ui-express';
app.use('/api/swagger', swaggerUi.serve, swaggerUi.setup(specs));

console.log('Starting app...');

app.listen(config.app_port,  () => {
  console.log(`Server started at localhost:${config.app_port}!`);
});
