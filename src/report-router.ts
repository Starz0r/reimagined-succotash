import express from 'express';
import datastore from './datastore';
import { Report } from './model/Report';
import handle from './lib/express-async-catch';
import { adminCheck, userCheck } from './lib/auth-check';

const app = express.Router();
export default app;

/**
 * @swagger
 * 
 * /reports:
 *   get:
 *     summary: Report List (Admin Only)
 *     description: Report List (Admin Only)
 *     tags: 
 *       - Reports
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: The id of the report to return (just use /reports/{id} you meme)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: The type of reports to return
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
 *       401:
 *         description: unauthenticated (must log in to view reports)
 *       403:
 *         description: insufficient permissions (must be admin to view reports)
 */
app.route('/').get(adminCheck(), handle(async (req,res,next) => {  
  const n = await datastore.getReports({
    type: req.query.type,
    answered: req.query.answered,
    id: req.params.id?+req.params.id:undefined,
    page: +req.query.page || 0,
    limit: +req.query.limit || 50
  });

  return res.send(n);
}));

/**
 * @swagger
 * 
 * /reports/{id}:
 *   get:
 *     summary: Get Report (Admin Only)
 *     description: Get Report (Admin Only)
 *     tags: 
 *       - Reports
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         description: The id of the report to return
 *     responses:
 *       200:
 *         description: return the matching report
 *       400:
 *         description: invalid report id
 *       401:
 *         description: unauthenticated (must log in to view reports)
 *       403:
 *         description: insufficient permissions (must be admin to view reports)
 *       404:
 *         description: report not found
 */
app.route('/:id').get(adminCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) return res.status(400).send({error:'id must be a number'});

  const report = await datastore.getReport(+req.params.id);
  if (!report) return res.sendStatus(404);
  return res.send(report);
}));

/**
 * @swagger
 * 
 * /reports/{id}:
 *   patch:
 *     summary: Update Report (Admin Only)
 *     description: Allows admins to update the report, marking it as resolved.
 *     tags: 
 *       - Reports
 *     produces:
 *       - application/json
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         description: The id of the report to return
 * 
 *     requestBody:
 *       description: The fields on the report to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id: 
 *                 type: integer
 *               answeredById: 
 *                 type: integer
 *               dateAnswered: 
 *                 type: string
 * 
 *     responses:
 *       200:
 *         description: return the updated report
 *       400:
 *         description: invalid report id
 *       401:
 *         description: unauthenticated (must log in to view reports)
 *       403:
 *         description: insufficient permissions (must be admin to view reports)
 *       404:
 *         description: report not found
 */
app.route('/:id').patch(adminCheck(), handle(async (req,res,next) => {
  if (isNaN(+req.params.id)) return res.status(400).send({error:'id must be a number'});

  const rid = +req.params.id;

  const ogReport = await datastore.getReport(rid);
  if (!ogReport) return res.sendStatus(404);

  const report = {
    id: rid,
    answeredById: req.body.answeredById, 
    dateAnswered: req.body.dateAnswered
  } as Report;

  const success = await datastore.updateReport(report);
  if (success) return res.send(await datastore.getReport(rid));
  else throw 'failed to update report';
}));

/**
 * @swagger
 * 
 * /reports:
 *   post:
 *     summary: Submit Report (User/Admin Only)
 *     description: Allows a user to submit a report.
 *     tags: 
 *       - Reports
 *     produces:
 *       - application/json
 * 
 *     requestBody:
 *       description: The fields on the report to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: 
 *                 type: string
 *                 enum:
 *                   - screenshot_add
 *                   - screenshot_approve
 *                   - review_remove
 *                   - screenshot_deny
 *                   - review
 *                   - game
 *                   - game_add
 *                   - game_remove
 *                   - screenshot_remove
 *                   - user_register
 *                   - user
 *                   - user_password_change
 *                   - game_update_url
 *                   - review_restore
 *                   - screenshot
 *                   - game_update_owner
 *                   - game_update_creator
 *                 description: The report type
 *               targetId: 
 *                 type: integer
 *                 description: The id of the thing being reported. If an attempt to 
 *                   retrieve the entity fails, will return a 400.
 *               report: 
 *                 type: string
 *                 description: the contents of the report
 * 
 *     responses:
 *       200:
 *         description: return the updated report
 *       400:
 *         description: invalid type for role
 *       401:
 *         description: unauthenticated (must log in to submit a report)
 */
app.route('/').post(userCheck(), handle(async (req,res,next) => {
  const uid = req.user.sub;

  const report = req.body as Report;
  delete report.answeredById;
  delete report.dateAnswered;
  
  return res.send(await datastore.addReport(report,uid));
}));