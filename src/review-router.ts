import datastore from './datastore';
import express from 'express';

const app = express.Router();
export default app;

app.route('/:id').get((req,res,next) => {
  if (isNaN(req.params.id)) {
    res.status(400).send({error:'id must be a number'});
  }

  var id = parseInt(req.params.id, 10);
  datastore.getReviews({id:id})
    .then(rows => { 
      if (rows.length == 0) res.sendStatus(404);
      else res.send(rows[0]); 
    })
    .catch(err => next(err));
});

app.route('/').get((req,res,next) => {
  var page = +req.query.page || 0;
  var limit = +req.query.limit || 50;
  datastore.getReviews({page:page,limit:limit})
    .then(rows => res.send(rows))
    .catch(err => next(err));
});