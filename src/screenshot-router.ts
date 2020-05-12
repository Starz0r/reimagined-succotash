import express from 'express';
import datastore from './datastore';
import { GetScreenshotParms } from "./model/GetScreenshotParms";
import { Screenshot } from "./model/Screenshot";
import handle from './lib/express-async-catch';
import { adminCheck } from './lib/auth-check';
import { Permission } from './model/Permission';

const app = express.Router();
export default app;

/**
 * @swagger
 * 
 * /screenshots:
 *   get:
 *     summary: Get Screenshots
 *     description: Get Screenshots
 *     tags: 
 *       - Screenshots
 *     produces:
 *       - application/json
 *     parameters:
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
 *         description: List of matching screenshots (or an empty array if no match)
 */
app.route('/').get(handle(async (req,res,next) => {  
  var isAdmin = req.user && req.user.isAdmin;
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;

  let parms: GetScreenshotParms = {page,limit,removed:req.query.removed}; 
  if (!isAdmin) parms.removed = false; //TODO: allow toggle
  const rows = await datastore.getScreenshots(parms);
  res.send(rows);
}));

/**
 * @swagger
 * 
 * /screenshots/{id}:
 *   get:
 *     summary: Get Screenshot
 *     description: Get Screenshot
 *     tags: 
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
 *         description: The id of the screenshot to return
 *     responses:
 *       200:
 *         description: Object describing the screenshot
 *       400:
 *         description: Invalid screenshot id
 *       404:
 *         description: Screenshot not found
 */
app.route('/:id').get(handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) {
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

app.route('/:id').delete(adminCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) return res.status(400).send({error:'id must be a number'});
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
  
  datastore.addReport({
    type:"screenshot_remove",
    targetId:""+ssPatch.id,
    report:"Screenshot Removed"
  },req.user.sub);

  res.sendStatus(204);
}));

app.route('/:id').patch(adminCheck(), handle(async (req,res,next) => {

  var gid = parseInt(req.params.id, 10);

  let game = req.body as Screenshot;
  game.id = gid;
  
  const gameFound = await datastore.updateScreenshot(game,req.user.isAdmin);
  if (!gameFound) return res.sendStatus(404);

  const newGame = await datastore.getScreenshot(gid);
  if (newGame == null) res.sendStatus(404);
  
  const userScreenshots = await datastore.getScreenshots({addedById: newGame!.addedById!, approved: true,page:0,limit:10});
  if (userScreenshots.length >= 10) {
    console.log('grant permission')
    await datastore.grantPermission(newGame!.addedById!,Permission.AUTO_APPROVE_SCREENSHOT);
  }

  res.send(newGame);
}));