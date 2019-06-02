import datastore from './datastore';
import express from 'express';

const app = express.Router();
export default app;

app.route('/:id').get(async (req,res,next) => {
  if (isNaN(req.params.id)) return res.status(400).send({error:'id must be a number'});

  var id = parseInt(req.params.id, 10);
  try {
    const review = await datastore.getReview(id);
    if (review == null) return res.sendStatus(404);
    return res.send(review);
  } catch (err) {
    next(err);
  }
});

app.route('/').get((req,res,next) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  datastore.getReviews({page:page,limit:limit})
    .then(rows => res.send(rows))
    .catch(err => next(err));
});

app.route('/:id').post(async (req,res,next) => {
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

  try {
    await datastore.updateReview(review);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/likes/:userId').put(async (req,res,next) => {
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

  try {
    await datastore.addLikeToReview(rid,uid);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

app.route('/:id/likes/:userId').delete(async (req,res,next) => {
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

  try {
    await datastore.removeLikeFromReview(rid,uid);
    return res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});