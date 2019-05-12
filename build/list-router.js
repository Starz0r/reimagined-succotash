"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var database_1 = require("./database");
var datastore_1 = __importDefault(require("./datastore"));
var app = express_1.default.Router();
exports.default = app;
app.route('/:listId').post(function (req, res, next) {
    var uid = req.body.userId;
    var gid = req.body.gameId;
    var value = req.body.value;
    var lid = parseInt(req.params.listId, 10);
    if (!req.user || req.user.sub == null || req.user.sub != uid) {
        res.status(403).send({ error: 'user cannot update this list' });
        return;
    }
    if (!value) {
        var database_2 = new database_1.Database();
        var query = "\n        DELETE FROM lists \n        WHERE user_id=? AND game_id=? AND list_id=?\n      ";
        database_2.query(query, [uid, gid, lid])
            .then(function () { return datastore_1.default.getLists(uid, gid)
            .then(function (rows) { return res.send(rows); })
            .catch(function (err) { return next(err); }); })
            .then(function () { return database_2.close(); })
            .catch(function (err) {
            database_2.close();
            next(err);
        });
    }
    else {
        var database_3 = new database_1.Database();
        var query = "\n        INSERT INTO lists \n        (user_id,game_id,list_id)\n        VALUES (?,?,?)\n      ";
        database_3.query(query, [uid, gid, lid])
            .then(function () { return datastore_1.default.getLists(uid, gid)
            .then(function (rows) { return res.send(rows); })
            .catch(function (err) { return next(err); }); })
            .then(function () { return database_3.close(); })
            .catch(function (err) {
            database_3.close();
            next(err);
        });
    }
});
