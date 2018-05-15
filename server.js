const express = require('express');
const bodyParser = require('body-parser');
const uuid = require('uuid/v4');
const moment = require('moment');

const Database = require('./database');

const jwt_middleware = require('express-jwt');
const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const bcrypt_salt = 10;

const config = require('./config');

const app = express();
app.use(function (req,res,next) {
  console.log(req.originalUrl);
  next();
});

app.use(bodyParser.json({type:"*/*"}));

app.use(jwt_middleware({
  secret: config.app_jwt_secret,
  credentialsRequired: false
}).unless({path: ['/login']}));

app.use(function (err,req,res,next) {
  if (req.user) {
    req.user.roles = ['game_update'];
  }
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

app.listen(config.app_port,  () => {
  console.log('Server started at localhost:4201!');
});

app.route('/api/login').post((req,res,next) => {
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
          expiresIn: 60*60*24,
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

app.route('/api/users/:id').get((req,res) => {
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
    });
});

app.route('/api/users/:id/reviews').get((req,res) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  getReviews({user_id:id,page:page,limit:limit})
    .then(rows => {
      res.send(rows); 
    })
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
    });
});

app.route('/api/games').get((req,res) => {
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
    });
});

function whitelist(input,valid,defval) {
  if (input === null || input === undefined) return defval;
  for (var i = 0; i < valid.length; i++) {
    if (input.toLowerCase() === valid[i].toLowerCase()) return input;
  }
  return defval;
}

app.route('/api/games/:id').get((req,res) => {
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
    getRandomGame(callback);
  } else if (!isNaN(req.params.id)) {
    var id = parseInt(req.params.id, 10);
    getGame(id,callback);
  } else {
    res.status(400).send({error:'id must be a number'});
  }
});

app.route('/api/reviews/:id').get((req,res) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
  }

  var id = parseInt(req.params.id, 10);
  getReviews(
    {id:id}, 
    rows => { 
      if (rows.length == 0) res.sendStatus(404);
      else res.send(rows[0]); 
    }
  );
});

app.route('/api/reviews').get((req,res) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  getReviews({page:page,limit:limit}, 
    rows => res.send(rows)
  );
});

app.route('/api/games/:id/reviews').get((req,res) => {
  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  getReviews(
    {game_id:id,page:page,limit:limit}, 
    rows => res.send(rows)
  );
});

app.route('/api/games/:id/screenshots').get((req,res) => {
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
    });
});

app.route('/api/users/:uid/games/:gid/lists').get((req,res) => {
  var uid = parseInt(req.params.uid, 10);
  var gid = parseInt(req.params.gid, 10);

  getLists(uid,gid,rows => res.send(rows));
});

app.route('/api/lists/:listId').post((req,res) => {
  const uid = req.body.userId;
  const gid = req.body.gameId;
  const value = req.body.value;
  const lid = parseInt(req.params.listId, 10);
  
  if (!req.user || req.user.sub == null || req.user.sub != uid) {
    res.status(403).send();
    return;
  }

  if (!value) {
    const database = new Database();
    var query = `
      DELETE FROM lists 
      WHERE user_id=? AND game_id=? AND list_id=?
    `;
    database.query(query,[uid,gid,lid])
      .then(() => getLists(uid,gid, rows => res.send(rows)))
      .then(() => database.close())
      .catch(err => {
        console.log(err);
        database.close();
      });
  } else {
    const database = new Database();
    var query = `
      INSERT INTO lists 
      (user_id,game_id,list_id)
      VALUES (?,?,?)
    `;
    database.query(query,[uid,gid,lid])
      .then(() => getLists(uid,gid, rows => res.send(rows)))
      .then(() => database.close())
      .catch(err => {
        console.log(err);
        database.close();
      });
  }
});

function getLists(uid,gid,callback) {
  const database = new Database();
  var query = `
    SELECT l.list_id, l.game_id, n.list_name
    FROM lists l
    JOIN LIST_NAMES n ON n.list_id=l.list_id
    WHERE l.user_id=?
    AND l.game_id=?
  `;
  database.query(query,[uid,gid])
    .then(callback)
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
    });
}

function getReviews(options, callback) {
  const database = new Database();
  const params = [];
  let where = '';
  if (options.game_id) {
    params.push(options.game_id);
  }
  if (options.user_id) {
    params.push(options.user_id);
  }
  if (options.id) {
    params.push(options.id);
  }
  if (options.page !== undefined) {
    params.push(options.page);
    params.push(options.limit);
  }
  var isAdmin = false;
  var query = `
    SELECT r.*, u.name user_name, g.name game_name
    FROM rating r
    JOIN user u ON r.user_id=u.id
    JOIN game g on r.game_id=g.id
    WHERE 1=1
    ${options.game_id?' AND r.game_id = ? ':''}
    ${options.user_id?' AND r.user_id = ? ':''}
    ${options.id?' AND r.id = ? ':''}
    ${isAdmin?'':' AND r.removed=0 '}
    ORDER BY r.date_created DESC
    ${options.page!==undefined?' LIMIT ?,? ':''}
  `;
  database.query(query,params)
    .then(callback)
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
    });
}

function getGame(id,callback,database) {
  database = database || new Database();
  query = `
    SELECT g.*
         , AVG(r.rating) AS rating
         , AVG(r.difficulty) AS difficulty 
    FROM game g 
    JOIN rating r ON r.game_id = g.id AND r.removed = 0
    WHERE g.id = ?
  `;
  database.query(query,[id])
    .then(callback)
    .then(() => database.close())
    .catch(err => {
      console.log(err);
      database.close();
    });
}

function getRandomGame(callback) {
  const database = new Database();
  query = `
    SELECT COUNT(*) AS cnt FROM Game 
    WHERE removed=0 AND url != '' AND url IS NOT NULL
  `;
  query2 = `
    SELECT id FROM Game 
    WHERE removed=0 AND url != '' AND url IS NOT NULL 
    LIMIT 1 OFFSET ?
  `;
  database.query(query)
    .then(rows => database.query(query2,[Math.floor(+rows[0].cnt*Math.random())]))
    .then(rows => getGame(rows[0].id,callback,database));
}