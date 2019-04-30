const express = require('express');

const app = express.Router();
module.exports = app;

app.route('/').get((req,res,next) => {
  res.send('pong')
});
  