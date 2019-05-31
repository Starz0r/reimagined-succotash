import express from 'express';
import datastore from './datastore';
import { GetGamesParms } from "./model/GetGamesParms";
import { GetScreenshotParms } from "./model/GetScreenshotParms";
import { Screenshot } from "./model/Screenshot";
import { Game } from "./model/Game";
import whitelist from './lib/whitelist';


import multer from 'multer';
const upload = multer({ dest: 'uploads/' }) //TODO

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

  params.removed = false;
  params.name = req.query.name;
  params.tags = req.query.tags;
  params.author = req.query.author;
  params.hasDownload = req.query.hasDownload;
  params.createdFrom = req.query.createdFrom;
  params.createdTo = req.query.createdTo;
  params.clearedByUserId = req.query.clearedByUserId;
  params.reviewedByUserId = req.query.reviewedByUserId;

  params.ratingFrom = req.query.ratingFrom;
  params.ratingTo = req.query.ratingTo;
  params.difficultyFrom = req.query.difficultyFrom;
  params.difficultyTo = req.query.difficultyTo;

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

app.route('/:id/reviews').get(async (req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }
  
  var gameId = parseInt(req.params.id,10);

  const game = await datastore.gameExists(gameId);
  if (!game) return res.sendStatus(404);

  var id = parseInt(req.params.id, 10);
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  try {
    const rows = await datastore.getReviews({game_id:id,page:page,limit:limit});
    res.send(rows);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/reviews').post(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});
  if (!req.user) return res.sendStatus(401);
  
  var gameId = parseInt(req.params.id,10);

  try {
    const newReview = await datastore.addReview(req.body,gameId,req.user.sub);
    res.send(newReview);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/screenshots').get(async (req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
    return;
  }
  
  var gameId = parseInt(req.params.id,10);

  const game = await datastore.gameExists(gameId);
  if (!game) return res.sendStatus(404);
  
  var isAdmin = req.user && req.user.isAdmin;
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  let parms: GetScreenshotParms = {gameId,page,limit};
  if (!isAdmin) parms.removed = false;
  try {
    const rows = await datastore.getScreenshots(parms);
    res.send(rows);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/screenshots').post(upload.single('screenshot'), async (req,res,next) => {
  if (isNaN(req.params.id)) {
    return res.status(400).send({error:'id must be a number'});
  }
  const gameId = parseInt(req.params.id,10);

  if (!req.user || !req.user.sub) return res.sendStatus(401);

  const game = await datastore.gameExists(gameId);
  if (!game) return res.sendStatus(404);
  const ss: Screenshot = {
    gameId: req.params.id,
    description: req.body.description
  };

  try {
    const rows = await datastore.addScreenshot(ss,req.user.sub);
    res.send(rows);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/tags').get(async (req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'invalid game id'});
    return;
  }

  var gameId = parseInt(req.params.id,10);

  const game = await datastore.gameExists(gameId);
  if (!game) return res.sendStatus(404);

  try {
    const tags = datastore.getTags({gameId});
    res.send(tags);
  } catch (err) {
    next(err);
  }
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