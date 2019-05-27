import express from 'express';
import moment from 'moment';
import datastore, { Game, GetScreenshotParms, GetGamesParms } from './datastore';
import { Database } from './database';
import whitelist from './lib/whitelist';

const app = express.Router();
export default app;

app.route('/').post(async (req,res,next) => {
  if (!req.user || !req.user.sub || !req.user.isAdmin) {
    res.status(403).send({error:'unauthorized access'});
    return;
  }
  const uid = req.user.sub;

  try {
    const game = await datastore.addGame(req.body,uid);
    res.send(game);
  } catch (err) {
    next(err);
  }
});

app.route('/').get(async (req,res,next) => {
  var order_col = whitelist(
    req.query.order_col,
    ['sortname','date_created'],
    'sortname');
  order_col = 'g.'+order_col;
  let order_dir = whitelist(
    req.query.order_dir,
    ['ASC','DESC'],
    'ASC') as 'ASC'|'DESC';
  var isAdmin = req.user && req.user.isAdmin;

  const params: GetGamesParms = {
    page: +req.query.page || 0,
    limit: +req.query.limit || 50,
    orderCol: order_col,
    orderDir: order_dir
  };
  if (!isAdmin) params.removed = false;
  if (req.query.q) params.name = req.query.q;

  try {
    const rows = await datastore.getGames(params);
    res.send(rows);
  } catch (err) {
    next(err);
  }
});

app.route('/:id').get(async (req,res,next) => {
  let game;
  if (req.params.id === 'random') {
    game = await datastore.getRandomGame();
  } else if (!isNaN(req.params.id)) {
    var id = parseInt(req.params.id, 10);
    game = await datastore.getGame(id);
  } else {
    res.status(400).send({error:'id must be a number'});
    return;
  }

  if (!game) {
    res.sendStatus(404);
    return;
  }
  game = game!;
  
  //if zero date, we don't have it, so null it out
  if (!moment(game.dateCreated).isValid()) game.dateCreated = undefined;
  if (game.collab && game.author_raw) game.author = (game.author_raw).split(" ");
  else game.author = game.author_raw?[game.author_raw]:[];
  res.send(game); 
});

app.route('/:id').delete(async (req,res,next) => { //TODO: keep this?
  if (!req.user || !req.user.isAdmin) return res.status(403).send({error:'Unauthorized'});

  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  var id = parseInt(req.params.id, 10);
  let game = await datastore.getGame(id);

  if (!game) return res.sendStatus(404);
  game = game!;

  if (game.removed) return res.send({message:'Game is already deleted'});

  let gamePatch: Game = {
    id: req.params.id,
    removed: true
  };
  try {
    const success = await datastore.updateGame(gamePatch,req.user.isAdmin);
    if (!success) return res.sendStatus(404);

    res.sendStatus(204);
  } catch (err) {
    next(err);
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
  datastore.getReviews({game_id:id,page:page,limit:limit})
    .then(rows=>res.send(rows))
    .catch(err=>next(err));;
});

app.route('/:id/screenshots').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }
  
  var isAdmin = req.user && req.user.isAdmin;

  let parms: GetScreenshotParms = {};
  parms.gameId = req.params.id;
  if (!isAdmin) parms.removed = false;
  try {
    const rows = datastore.getScreenshots(parms);
    res.send(rows);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/tags').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }

  const database = new Database();
  var gid = parseInt(req.params.id,10);
  var query = `
    SELECT gt.*, t.name, t.id
    FROM GameTag gt
    JOIN Game g on g.id = gt.game_id AND g.removed = 0
    INNER JOIN Rating AS r ON r.user_id = gt.user_id AND r.game_id = gt.game_id AND r.removed=0
    JOIN Tag t on t.id = gt.tag_id
    WHERE gt.game_id = ?
  `;
  database.query(query,[gid])
    .then(rows => { res.send(rows); })
    .then(() => database.close())
    .catch(err => {
      database.close();
      next(err);
    });
});

app.route('/:id').patch(async (req,res,next) => {
  //restrict to admins
  if (!req.user || !req.user.isAdmin) return res.status(403).send({error:'Unauthorized'});

  var gid = parseInt(req.params.id, 10);

  let game = req.body as Game;
  game.id = gid;

  try {
    const gameFound = await datastore.updateGame(game,req.user.isAdmin);
    if (!gameFound) return res.sendStatus(404);

    const newGame = await datastore.getGame(gid);
    if (newGame == null) res.sendStatus(404);
    else res.send(newGame);
  } catch (err) {
    next(err);
  }
});