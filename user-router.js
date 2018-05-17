const express = require('express');
const Database = require('./database');
const datastore = require('./datastore');

const app = express.Router();
module.exports = app;

app.route('/:uid/games/:gid/lists').get((req,res,next) => {
  var uid = parseInt(req.params.uid, 10);
  var gid = parseInt(req.params.gid, 10);

  datastore.getLists(uid,gid,rows => res.send(rows),next);
});

app.route('/:id/reviews').get((req,res,next) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  datastore.getReviews(
    {user_id:id,page:page,limit:limit},
    rows => { res.send(rows) },
    next
  );
});

app.route('/:id').get((req,res,next) => {
  var id = parseInt(req.params.id, 10);
  const database = new Database();
  const isAdmin = false;
  const removedClause = isAdmin?'':'AND banned = 0';
  query = `
    SELECT u.id, u.name, u.date_created
         , u.twitch_link, u.youtube_link
         , u.nico_link, u.twitter_link
         , u.bio
    FROM user u 
    WHERE u.id = ? ${removedClause}
  `;
  database.query(query,[id])
    .then(rows => {
      if (rows.length == 0) res.sendStatus(404);
      else {
        res.send(rows[0]); 
      }
    })
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
      next(err);
    });
});
