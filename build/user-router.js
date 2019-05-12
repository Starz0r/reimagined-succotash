"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var database_1 = require("./database");
var datastore_1 = __importDefault(require("./datastore"));
var app = express_1.default.Router();
exports.default = app;
//register
app.route('/').post(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
    var success, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, datastore_1.default.addUser(req.body.username, req.body.password, req.body.email)];
            case 1:
                success = _a.sent();
                if (success)
                    res.send({ message: "Registration Successful" });
                else
                    res.status(400).send({ error: "User Exists" });
                return [3 /*break*/, 3];
            case 2:
                err_1 = _a.sent();
                next(err_1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
app.route('/:uid/games/:gid/lists').get(function (req, res, next) {
    var uid = parseInt(req.params.uid, 10);
    var gid = parseInt(req.params.gid, 10);
    datastore_1.default.getLists(uid, gid)
        .then(function (rows) { return res.send(rows); })
        .catch(function (err) { return next(err); });
});
app.route('/:id/reviews').get(function (req, res, next) {
    var id = parseInt(req.params.id, 10);
    var page = +req.query.page || 0;
    var limit = +req.query.limit || 50;
    datastore_1.default.getReviews({ user_id: id, page: page, limit: limit })
        .then(function (rows) { return res.send(rows); })
        .catch(function (err) { return next(err); });
});
app.route('/:id').get(function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
    var id, database, isAdmin, removedClause, query, rows, err_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                id = parseInt(req.params.id, 10);
                database = new database_1.Database();
                isAdmin = false;
                removedClause = isAdmin ? '' : 'AND banned = 0';
                query = "\n    SELECT u.id, u.name, u.date_created\n         , u.twitch_link, u.youtube_link\n         , u.nico_link, u.twitter_link\n         , u.bio\n    FROM User u \n    WHERE u.id = ? " + removedClause + "\n  ";
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, 4, 5]);
                return [4 /*yield*/, database.query(query, [id])];
            case 2:
                rows = _a.sent();
                if (rows.length == 0)
                    res.sendStatus(404);
                else
                    res.send(rows[0]);
                return [3 /*break*/, 5];
            case 3:
                err_2 = _a.sent();
                next(err_2);
                return [3 /*break*/, 5];
            case 4:
                database.close();
                return [7 /*endfinally*/];
            case 5: return [2 /*return*/];
        }
    });
}); });
