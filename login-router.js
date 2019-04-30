const express = require('express');
const Database = require('./database');
const jwt = require('jsonwebtoken');
const config = require('./config/config');
const bcrypt = require('bcrypt');
const bcrypt_salt = 10;

const app = express.Router();
module.exports = app;

app.route('/').post((req,res,next) => {
    const username = req.body.username;
    const password = req.body.password;
  
    var user;
    
    const database = new Database();
    database.query('SELECT * FROM user WHERE name = ?',[username])
      .then(rows => {
        if (rows.length == 0) {
          res.status(401).send({error: 'Invalid Credentials'});
        } else {
          return rows[0];
        }
      })
      .then(user_res => {
        user = user_res;
        return bcrypt.compare(password,user.phash2.replace(/^\$2y/, "$2a"))
      })
      .then(pwres => {
        if (!pwres) {
          res.status(401).send({error: 'Invalid Credentials'});
        } else {
          user.token = jwt.sign({
            username: user.name
          },
          config.app_jwt_secret,
          {
            expiresIn: "1 day",
            subject: ""+user.id
          });
          res.send(user);
        }
      })
      .then(() => { database.close(); })
      .catch(err => {
        database.close();
        next(err);
      });
  });
  