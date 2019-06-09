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


/**
 * @swagger
 * 
 * /games/{id}:
 *   post:
 *     summary: Add Game (Admin Only)
 *     description: Add Game (Admin Only)
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return
 * 
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *               url: 
 *                 type: string
 *               urlSpdrn: 
 *                 type: string
 *               author: 
 *                 type: string
 *               collab: 
 *                 type: boolean
 *               dateCreated: 
 *                 type: string
 *               ownerId: 
 *                 type: integer
 * 
 *     responses:
 *       200:
 *         description: The Game object, after creation
 *       403:
 *         description: Insufficient privileges (requires an admin account)
 */
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

/**
 * @swagger
 * 
 * /games:
 *   get:
 *     summary: Game List
 *     description: Game List
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: integer
 *         description: The exact id of the game to return
 *       - in: query
 *         name: removed
 *         schema:
 *           type: boolean
 *         description: (admin only) Whether to return removed games. Forced to false (non-removed only) for users
 *       - in: query
 *         name: name
 *         schema:
 *           type: string
 *         description: Game name (allows partial match)
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         description: Comma-separated list of tags to filter by
 *       - in: query
 *         name: author
 *         schema:
 *           type: string
 *         description: Author name (allows partial search)
 *       - in: query
 *         name: hasDownload
 *         schema:
 *           type: boolean
 *         description: Whether or not the game has a download associated
 *       - in: query
 *         name: createdFrom
 *         schema:
 *           type: date
 *         description: The earliest creation date to filter games by
 *       - in: query
 *         name: createdTo
 *         schema:
 *           type: date
 *         description: The latest creation date to filter games by
 *       - in: query
 *         name: clearedByUserId
 *         schema:
 *           type: integer
 *         description: The user id of a user who has indicated they have cleared the game
 *       - in: query
 *         name: reviewedByUserId
 *         schema:
 *           type: integer
 *         description: The user id of a user who has reviewed the game
 *       - in: query
 *         name: ratingFrom
 *         schema:
 *           type: integer
 *         description: A minimum rating
 *       - in: query
 *         name: ratedTo
 *         schema:
 *           type: integer
 *         description: A maximum rating
 *       - in: query
 *         name: difficultyFrom
 *         schema:
 *           type: integer
 *         description: A minimum difficulty
 *       - in: query
 *         name: difficultyTo
 *         schema:
 *           type: integer
 *         description: A maximum difficulty
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: The page of results to return (default 0)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: The number of results per page (default 50, maximum 50)
 *     responses:
 *       200:
 *         description: returns a list of games matching filters
 */
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

  params.id = req.query.id;
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

/**
 * @swagger
 * 
 * /games/{id}:
 *   get:
 *     summary: Get Game
 *     description: Get Game
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return 
 *           (or the literal 'random' for a random game)
 *     responses:
 *       200:
 *         description: Object describing the game
 *       404:
 *         description: Game not found
 */
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

/**
 * @swagger
 * 
 * /games/{id}:
 *   delete:
 *     summary: Remove Game (Admin only)
 *     description: Remove Game. This is idempotent - repeated deletions of the 
 *       same game have no effect.
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return 
 *           (or the literal 'random' for a random game)
 *     responses:
 *       204:
 *         description: Object describing the game
 *       400:
 *         description: Invalid game id
 *       403:
 *         description: Insufficient privileges (requires an admin account)
 *       404:
 *         description: Game not found
 */
app.route('/:id').delete(async (req,res,next) => { //TODO: keep this?
  if (!req.user || !req.user.isAdmin) return res.sendStatus(403);

  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  var id = parseInt(req.params.id, 10);
  let game = await datastore.getGame(id);

  if (!game) return res.sendStatus(404);
  game = game!;

  if (game.removed) return res.sendStatus(204);

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

/**
 * @swagger
 * 
 * /games/{id}/reviews:
 *   get:
 *     summary: Get Reviews for Game
 *     description: Get Reviews for Game
 *     tags: 
 *       - Games
 *       - Reviews
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: The page of results to return (default 0)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: The number of results per page (default 50, maximum 50)
 *     responses:
 *       200:
 *         description: List of reviews for the game (or empty array if none)
 *       400:
 *         description: Invalid game id
 *       404:
 *         description: Game not found
 */
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

/**
 * @swagger
 * 
 * /games/{id}/reviews:
 *   post:
 *     summary: Add Review for Game (User/Admin Only)
 *     description: Add Review for Game (User/Admin Only)
 *     tags: 
 *       - Games
 *       - Reviews
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The id of the game to review
 * 
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: 
 *                 type: number
 *               difficulty: 
 *                 type: number
 *               comment: 
 *                 type: string
 *               removed: 
 *                 type: boolean
 * 
 *     responses:
 *       200:
 *         description: The review that was just added
 *       400:
 *         description: Invalid game id
 *       401:
 *         description: Unauthorized (must log in to add reviews)
 *       404:
 *         description: Game not found
 */
app.route('/:id/reviews').post(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});
  if (!req.user) return res.sendStatus(401);
  
  var gameId = parseInt(req.params.id,10);

  const game = await datastore.gameExists(gameId);
  if (!game) return res.sendStatus(404);

  try {
    const newReview = await datastore.addReview(req.body,gameId,req.user.sub);
    res.send(newReview);
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * 
 * /games/{id}/screenshots:
 *   get:
 *     summary: Get Screenshots for Game
 *     description: Get Screenshots for Game
 *     tags: 
 *       - Games
 *       - Screenshots
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: The page of results to return (default 0)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: The number of results per page (default 50)
 *     responses:
 *       200:
 *         description: List of screenshots for the game (or empty array if none)
 *       400:
 *         description: Invalid game id
 *       404:
 *         description: Game not found
 */
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

/**
 * @swagger
 * 
 * /games/{id}/screenshots:
 *   post:
 *     summary: Add Screenshot for Game (User/Admin Only)
 *     description: Add Screenshot for Game (User/Admin Only)
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The id of the game to add a screenshot to
 * 
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating: 
 *                 type: number
 *               difficulty: 
 *                 type: number
 *               comment: 
 *                 type: string
 *               removed: 
 *                 type: boolean
 * 
 *     responses:
 *       200:
 *         description: The screenshot that was just added
 *       400:
 *         description: Invalid game id
 *       401:
 *         description: Unauthorized (must log in to add reviews)
 *       404:
 *         description: Game not found
 */
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

/**
 * @swagger
 * 
 * /games/{id}/tags:
 *   get:
 *     summary: Get Tags Associated to Game
 *     description: Get Tags Associated to Game
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The exact id of the game to return
 *     responses:
 *       200:
 *         description: List of screenshots for the game (or empty array if none)
 *       400:
 *         description: Invalid game id
 *       404:
 *         description: Game not found
 */
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

/**
 * @swagger
 * 
 * /games/{id}:
 *   patch:
 *     summary: Update Game (Admin Only)
 *     description: Update Game (Admin Only)
 *     tags: 
 *       - Games
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The id of the game to edit
 * 
 *     requestBody:
 *       description: Optional description in *Markdown*
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: 
 *                 type: string
 *               url: 
 *                 type: string
 *               urlSpdrn: 
 *                 type: string
 *               author: 
 *                 type: string
 *               collab: 
 *                 type: boolean
 *               dateCreated: 
 *                 type: string
 *               ownerId: 
 *                 type: integer
 *             example:
 *               name: Crimson Needle 3
 *               url: http://fangam.es/crimsonneedle3
 *               author: Kalemandu, Plasmanapkin, Zero-G
 *               collab: true
 *               dateCreated: 2019-06-07
 *               ownerId: 1
 * 
 *     responses:
 *       200:
 *         description: The Game object, after update
 *       400:
 *         description: Invalid game id
 *       403:
 *         description: Insufficient privileges (requires an admin account)
 */
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