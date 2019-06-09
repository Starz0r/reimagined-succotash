import express from 'express';
import datastore from './datastore';
import { GetScreenshotParms } from "./model/GetScreenshotParms";
import { Screenshot } from "./model/Screenshot";
import handle from './lib/express-async-catch';

const app = express.Router();
export default app;

app.route('/').get(handle(async (req,res,next) => {  
  var isAdmin = req.user && req.user.isAdmin;
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  let parms: GetScreenshotParms = {page,limit}; 
  if (!isAdmin) parms.removed = false; //TODO: allow toggle
  const rows = await datastore.getScreenshots(parms);
  res.send(rows);
}));

app.route('/:id').get(handle(async (req,res,next) => {
  if (isNaN(req.params.id)) {
    return res.status(400).send({error:'id must be a number'});
  }
  var id = parseInt(req.params.id, 10);
  
  var isAdmin = req.user && req.user.isAdmin;

  const screenshot = await datastore.getScreenshot(id);
  if (!screenshot || (!isAdmin && screenshot.removed)) {
    return res.sendStatus(404);
  }
  res.send(screenshot);
}));

app.route('/:id').delete(handle(async (req,res,next) => {
  if (!req.user || !req.user.isAdmin) return res.status(403).send({error:'Unauthorized'});
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});
  var id = parseInt(req.params.id, 10);
  let screenshot = await datastore.getScreenshot(id);

  if (!screenshot) return res.sendStatus(404);
  screenshot = screenshot!;

  if (screenshot.removed) return res.send({message:'Screenshot is already deleted'});

  let ssPatch: any = {
    id: req.params.id,
    removed: true
  };
  await datastore.updateScreenshot(ssPatch,req.user.isAdmin);
  res.sendStatus(204);
}));

app.route('/:id').patch(handle(async (req,res,next) => {
  //restrict to admins
  if (!req.user || !req.user.isAdmin) return res.status(403).send({error:'Unauthorized'});

  var gid = parseInt(req.params.id, 10);

  let game = req.body as Screenshot;
  game.id = gid;
  
  const gameFound = await datastore.updateScreenshot(game,req.user.isAdmin);
  if (!gameFound) return res.sendStatus(404);

  const newGame = await datastore.getScreenshot(gid);
  if (newGame == null) res.sendStatus(404);
  else res.send(newGame);
}));