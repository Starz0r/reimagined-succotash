const express = require('express');
const moment = require('moment');
const Database = require('./database');
const datastore = require('./datastore');

const app = express.Router();
module.exports = app;

app.route('/').get((req,res,next) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  var q = req.query.q ? `%${req.query.q}%` : '%';
  var order_col = whitelist(
    req.query.order_col,
    ['sortname','date_created'],
    'sortname');
  order_col = 'g.'+order_col;
  var order_dir = whitelist(
    req.query.order_dir,
    ['ASC','DESC'],
    'ASC');
  var isAdmin = false;
  const database = new Database();
  query = `
    SELECT g.*, AVG(r.rating) AS rating, AVG(r.difficulty) AS difficulty
    FROM game g
    JOIN rating r ON r.removed=0 AND r.game_id=g.id
    WHERE g.name LIKE ?
    ${isAdmin?'':' AND g.removed = 0 '}
    GROUP BY g.id
    ORDER BY ${order_col} ${order_dir}
    LIMIT ?,?
  `;
  database.query(query,[q,page*limit,limit])
    .then(rows => {
      rows.forEach(game => {
        if (!moment(game.date_created).isValid()) game.date_created = null;
        if (game.collab == 1) game.author = game.author.split(" ");
        else game.author = [game.author];
      });
      res.send(rows); 
    })
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
      next(err);
    });
});

function whitelist(input,valid,defval) {
  if (input === null || input === undefined) return defval;
  for (var i = 0; i < valid.length; i++) {
    if (input.toLowerCase() === valid[i].toLowerCase()) return input;
  }
  return defval;
}

app.route('/:id').get((req,res,next) => {
  const callback = rows => {
    if (rows.length == 0) res.sendStatus(404);
    else {
      let game = rows[0];
      //if zero date, we don't have it, so null it out
      if (!moment(game.date_created).isValid()) game.date_created = null;
      if (game.collab == 1) game.author = game.author.split(" ");
      else game.author = [game.author];
      res.send(game); 
    }
  };

  if (req.params.id === 'random') {
    datastore.getRandomGame(callback,next);
  } else if (!isNaN(req.params.id)) {
    var id = parseInt(req.params.id, 10);

    datastore.getGame(id,callback,next);
  } else {
    res.status(400).send({error:'id must be a number'});
  }
});

app.route('/:id/reviews').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }

  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  datastore.getReviews(
    {game_id:id,page:page,limit:limit}, 
    rows => res.send(rows),
    next
  );
});

app.route('/:id/screenshots').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }

  var id = parseInt(req.params.id, 10);
  const database = new Database();
  var isAdmin = false;
  var query = `
    SELECT s.*, u.name user_name, g.name game_name
    FROM screenshot s
    JOIN user u ON s.added_by_id=u.id
    JOIN game g on s.game_id=g.id
    WHERE s.game_id = ?
    AND s.approved = 1
    ${!isAdmin?' AND s.removed = 0 ':''}
    ORDER BY s.date_created DESC
  `;
  database.query(query,[id])
    .then(rows => {
      res.send(rows); 
    })
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
      next(err);
    });
});

app.route('/:id/tags').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }

  const database = new Database();
  var gid = parseInt(req.params.id,10);
  var query = `
    SELECT gt.*, t.name as name
    FROM gametag gt
    JOIN game g on g.id = gt.game_id AND g.removed = 0
    JOIN tag t on t.id = gt.tag_id
    WHERE gt.game_id = ?
  `;
  database.query(query,[gid])
    .then(rows => { res.send(rows); })
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
      next(err);
    });
});
