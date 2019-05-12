"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var datastore_1 = __importDefault(require("./datastore"));
var express_1 = __importDefault(require("express"));
var app = express_1.default.Router();
exports.default = app;
app.route('/:id').get(function (req, res, next) {
    if (isNaN(req.params.id)) {
        res.status(400).send({ error: 'id must be a number' });
    }
    var id = parseInt(req.params.id, 10);
    datastore_1.default.getReviews({ id: id })
        .then(function (rows) {
        if (rows.length == 0)
            res.sendStatus(404);
        else
            res.send(rows[0]);
    })
        .catch(function (err) { return next(err); });
});
app.route('/').get(function (req, res, next) {
    var page = +req.query.page || 0;
    var limit = +req.query.limit || 50;
    datastore_1.default.getReviews({ page: page, limit: limit })
        .then(function (rows) { return res.send(rows); })
        .catch(function (err) { return next(err); });
});
