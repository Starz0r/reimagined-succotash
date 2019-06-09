import datastore from './datastore';
import express from 'express';
import handle from './lib/express-async-catch';

const app = express.Router();
export default app;

/**
 * @swagger
 * 
 * /reviews/{id}:
 *   get:
 *     summary: Get Review
 *     description: Get Review
 *     tags: 
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
 *         description: The exact id of the review to return
 *     responses:
 *       200:
 *         description: Object describing the review
 *       400:
 *         description: Invalid review id
 *       404:
 *         description: Review not found
 */
app.route('/:id').get(handle(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  var id = parseInt(req.params.id, 10);
  const review = await datastore.getReview(id);
  if (review == null) return res.sendStatus(404);
  return res.send(review);
}));

/**
 * @swagger
 * 
 * /reviews:
 *   get:
 *     summary: Get Reviews
 *     description: Get Reviews
 *     tags: 
 *       - Reviews
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
 *         description: List of matching reviews (or an empty array if no match)
 */
app.route('/').get(handle(async (req,res,next) => {
  //TODO: order by & dir
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  const rows = await datastore.getReviews({page:page,limit:limit});
  return res.send(rows);
}));

/**
 * @swagger
 * 
 * /reviews/{id}:
 *   patch:
 *     summary: Update Review (User Only)
 *     description: Update Review (User Only)
 *     tags: 
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
 *         description: The id of the review to update
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
 *       204:
 *         description: The review was updated
 *       400:
 *         description: Invalid review id
 *       401:
 *         description: Unauthorized (must log in to edit reviews)
 *       403:
 *         description: Insufficient privileges (must be an admin or the reviewer)
 */
app.route('/:id').patch(handle(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
  const isAdmin = req.user.isAdmin;

  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});
  const rid = req.params.id;

  const ogReview = await datastore.getReview(rid);
  if (ogReview === null) return res.sendStatus(404);

  const isReviewer = ogReview.userId == req.user.sub;

  if (!(isAdmin || isReviewer)) return res.sendStatus(403);

  const review = req.body;
  review.id = rid;

  if (!(isAdmin || isReviewer)) {
    delete review.removed;
  }

  await datastore.updateReview(review);
  return res.sendStatus(204);
}));

/**
 * @swagger
 * 
 * /reviews/{id}/likes/{userId}:
 *   put:
 *     summary: Like Review (User/Admin only)
 *     description: Indicates a user likes a review. Is idempotent - additional likes do nothing
 *     tags: 
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
 *         description: The exact id of the review to like
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The id of the user performing the like
 *     responses:
 *       204:
 *         description: Like was accepted
 *       400:
 *         description: Invalid review id or user id (check the error in response)
 *       401:
 *         description: Unauthenticated (log in first)
 *       403:
 *         description: Insufficient priviliges (must be an admin, or the user indicated in the url)
 *       404:
 *         description: Review not found
 */
app.route('/:id/likes/:userId').put(handle(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
  const isAdmin = req.user.isAdmin;

  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const rid = req.params.id;

  if (isNaN(req.params.userId)) 
    return res.status(400).send({error:'userId must be a number'});
  const uid = parseInt(req.params.userId, 10);
  
  if (req.user.sub != uid) return res.sendStatus(403);

  const ogReview = await datastore.getReview(rid);
  if (ogReview === null) return res.sendStatus(404);

  await datastore.addLikeToReview(rid,uid);
  return res.sendStatus(204);
}));

/**
 * @swagger
 * 
 * /reviews/{id}/likes/{userId}:
 *   put:
 *     summary: Unlike Review (User/Admin only)
 *     description: Removes the user's like from a review. Is idempotent - additional unlikes do nothing
 *     tags: 
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
 *         description: The exact id of the review to unlike
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *           minimum: 1
 *         required: true
 *         description: The id of the user performing the unlike
 *     responses:
 *       204:
 *         description: Unlike was accepted
 *       400:
 *         description: Invalid review id or user id (check the error in response)
 *       401:
 *         description: Unauthenticated (log in first)
 *       403:
 *         description: Insufficient priviliges (must be an admin, or the user indicated in the url)
 *       404:
 *         description: Review not found
 */
app.route('/:id/likes/:userId').delete(handle(async (req,res,next) => {
  if (!req.user || !req.user.sub) return res.sendStatus(401);
  const isAdmin = req.user.isAdmin;

  if (isNaN(req.params.id)) 
    return res.status(400).send({error:'id must be a number'});
  const rid = req.params.id;

  if (isNaN(req.params.userId)) 
    return res.status(400).send({error:'userId must be a number'});
  const uid = parseInt(req.params.userId, 10);
  
  if (req.user.sub != uid) return res.sendStatus(403);

  const ogReview = await datastore.getReview(rid);
  if (ogReview === null) return res.sendStatus(404);

  await datastore.removeLikeFromReview(rid,uid);
  return res.sendStatus(204);
}));