"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var database_1 = require("./database");
var jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
var config_1 = __importDefault(require("./config/config"));
var bcrypt_1 = __importDefault(require("bcrypt"));
var bcrypt_salt = 10;
var app = express_1.default.Router();
exports.default = app;
app.route('/').post(function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    var user;
    var database = new database_1.Database();
    database.query('SELECT * FROM user WHERE name = ?', [username])
        .then(function (rows) {
        if (rows.length == 0) {
            res.status(401).send({ error: 'Invalid Credentials' });
        }
        else {
            return rows[0];
        }
    })
        .then(function (user_res) {
        user = user_res;
        return bcrypt_1.default.compare(password, user.phash2.replace(/^\$2y/, "$2a"));
    })
        .then(function (pwres) {
        if (!pwres) {
            res.status(401).send({ error: 'Invalid Credentials' });
        }
        else {
            user.token = jsonwebtoken_1.default.sign({
                username: user.name
            }, config_1.default.app_jwt_secret, {
                expiresIn: "1 day",
                subject: "" + user.id
            });
            res.send(user);
        }
    })
        .then(function () { database.close(); })
        .catch(function (err) {
        database.close();
        next(err);
    });
});
