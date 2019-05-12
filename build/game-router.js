"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var moment_1 = __importDefault(require("moment"));
var datastore_1 = __importDefault(require("./datastore"));
var database_1 = require("./database");
var app = express_1.default.Router();
exports.default = app;
app.route('/').get(function (req, res, next) {
    var id = parseInt(req.params.id, 10);
    var page = +req.query.page || 0;
    var limit = +req.query.limit || 50;
    var q = req.query.q ? "%" + req.query.q + "%" : '%';
    var order_col = whitelist(req.query.order_col, ['sortname', 'date_created'], 'sortname');
    order_col = 'g.' + order_col;
    var order_dir = whitelist(req.query.order_dir, ['ASC', 'DESC'], 'ASC');
    var isAdmin = false;
    var database = new database_1.Database();
    var query = "\n    SELECT g.*, AVG(r.rating) AS rating, AVG(r.difficulty) AS difficulty\n    FROM game g\n    JOIN rating r ON r.removed=0 AND r.game_id=g.id\n    WHERE g.name LIKE ?\n    " + (isAdmin ? '' : ' AND g.removed = 0 ') + "\n    GROUP BY g.id\n    ORDER BY " + order_col + " " + order_dir + "\n    LIMIT ?,?\n  ";
    database.query(query, [q, page * limit, limit])
        .then(function (rows) {
        rows.forEach(function (game) {
            if (!moment_1.default(game.date_created).isValid())
                game.date_created = null;
            if (game.collab == 1)
                game.author = game.author.split(" ");
            else
                game.author = [game.author];
        });
        res.send(rows);
    })
        .then(function () { return database.close(); })
        .catch(function (err) {
        database.close();
        next(err);
    });
});
function whitelist(input, valid, defval) {
    if (input === null || input === undefined)
        return defval;
    for (var i = 0; i < valid.length; i++) {
        if (input.toLowerCase() === valid[i].toLowerCase())
            return input;
    }
    return defval;
}
app.route('/:id').get(function (req, res, next) {
    var callback = function (rows) {
        if (rows.length == 0)
            res.sendStatus(404);
        else {
            var game = rows[0];
            //if zero date, we don't have it, so null it out
            if (!moment_1.default(game.date_created).isValid())
                game.date_created = null;
            if (game.collab == 1)
                game.author = game.author.split(" ");
            else
                game.author = [game.author];
            res.send(game);
        }
    };
    if (req.params.id === 'random') {
        datastore_1.default.getRandomGame()
            .then(function (rows) { return callback(rows); })
            .catch(function (err) { return next(err); });
    }
    else if (!isNaN(req.params.id)) {
        var id = parseInt(req.params.id, 10);
        datastore_1.default.getGame(id)
            .then(function (rows) { return callback(rows); })
            .catch(function (err) { return next(err); });
        ;
    }
    else {
        res.status(400).send({ error: 'id must be a number' });
    }
});
app.route('/:id/reviews').get(function (req, res, next) {
    if (isNaN(req.params.id)) {
        res.status(400).send({ error: 'id must be a number' });
        return;
    }
    var id = parseInt(req.params.id, 10);
    var page = +req.query.page || 0;
    var limit = +req.query.limit || 50;
    datastore_1.default.getReviews({ game_id: id, page: page, limit: limit })
        .then(function (rows) { return res.send(rows); })
        .catch(function (err) { return next(err); });
    ;
});
app.route('/:id/screenshots').get(function (req, res, next) {
    if (isNaN(req.params.id)) {
        res.status(400).send({ error: 'id must be a number' });
        return;
    }
    var id = parseInt(req.params.id, 10);
    var database = new database_1.Database();
    var isAdmin = false;
    var query = "\n    SELECT s.*, u.name user_name, g.name game_name\n    FROM screenshot s\n    JOIN user u ON s.added_by_id=u.id\n    JOIN game g on s.game_id=g.id\n    WHERE s.game_id = ?\n    AND s.approved = 1\n    " + (!isAdmin ? ' AND s.removed = 0 ' : '') + "\n    ORDER BY s.date_created DESC\n  ";
    database.query(query, [id])
        .then(function (rows) {
        res.send(rows);
    })
        .then(function () { return database.close(); })
        .catch(function (err) {
        database.close();
        next(err);
    });
});
app.route('/:id/tags').get(function (req, res, next) {
    if (isNaN(req.params.id)) {
        res.status(400).send({ error: 'id must be a number' });
        return;
    }
    var database = new database_1.Database();
    var gid = parseInt(req.params.id, 10);
    var query = "\n    SELECT gt.*, t.name as name\n    FROM gametag gt\n    JOIN game g on g.id = gt.game_id AND g.removed = 0\n    JOIN tag t on t.id = gt.tag_id\n    WHERE gt.game_id = ?\n  ";
    database.query(query, [gid])
        .then(function (rows) { res.send(rows); })
        .then(function () { return database.close(); })
        .catch(function (err) {
        database.close();
        next(err);
    });
});
