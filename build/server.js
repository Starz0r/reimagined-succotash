"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var body_parser_1 = __importDefault(require("body-parser"));
var v4_1 = __importDefault(require("uuid/v4"));
var express_jwt_1 = __importDefault(require("express-jwt"));
//import jwt from 'jsonwebtoken';
var config_1 = __importDefault(require("./config/config"));
var game_router_1 = __importDefault(require("./game-router"));
var user_router_1 = __importDefault(require("./user-router"));
var review_router_1 = __importDefault(require("./review-router"));
var list_router_1 = __importDefault(require("./list-router"));
var login_router_1 = __importDefault(require("./login-router"));
var ping_router_1 = __importDefault(require("./ping-router"));
var database_1 = require("./database");
database_1.Database.init();
var app = express_1.default();
app.use(function (req, res, next) {
    console.log(req.originalUrl);
    next();
});
app.use(body_parser_1.default.json({ type: "*/*" }));
app.use(express_jwt_1.default({
    secret: config_1.default.app_jwt_secret,
    credentialsRequired: false
}));
var c = function (req, res, next) {
    if (req.user) {
        req.user.roles = ['game_update'];
    }
    next();
};
app.use(c);
//if !req.user throw error if required
/*app.use(function (err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    res.status(401).send({
      error: 'Authorization Required - please visit /login'
    });
  } else {
    next(err);
  }
});*/
var e = function (err, req, res, next) {
    var id = v4_1.default();
    console.log("severe error: id " + id);
    console.log(err);
    res.status(500).send({
        error: "Internal Server Error",
        id: id
    });
};
app.use(e);
app.use('/api/games', game_router_1.default);
app.use('/api/users', user_router_1.default);
app.use('/api/reviews', review_router_1.default);
app.use('/api/lists', list_router_1.default);
app.use('/api/login', login_router_1.default);
app.use('/api/ping', ping_router_1.default);
app.listen(config_1.default.app_port, function () {
    console.log('Server started at localhost:4201!');
});
