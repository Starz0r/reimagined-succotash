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
Object.defineProperty(exports, "__esModule", { value: true });
var database_1 = require("./database");
exports.default = {
    /**
     * true if user was created
     * false if user collision occurred
     */
    addUser: function (username, password, email) {
        return __awaiter(this, void 0, void 0, function () {
            var database, userExists;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        database = new database_1.Database();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 4, 5]);
                        return [4 /*yield*/, database.query("SELECT 1 FROM User WHERE name = ?", [username])];
                    case 2:
                        userExists = _a.sent();
                        if (userExists.length > 0)
                            return [2 /*return*/, false];
                        return [4 /*yield*/, database.execute("\n      INSERT INTO User (name, phash2, email) \n      VALUES ( ?, ?, ? )\n      ", [username, password, email])];
                    case 3:
                        _a.sent();
                        return [2 /*return*/, true];
                    case 4:
                        database.close();
                        return [7 /*endfinally*/];
                    case 5: return [2 /*return*/];
                }
            });
        });
    },
    getLists: function (uid, gid) {
        return __awaiter(this, void 0, void 0, function () {
            var database, query;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        database = new database_1.Database();
                        query = "\n      SELECT l.list_id, l.game_id, n.list_name\n      FROM lists l\n      JOIN LIST_NAMES n ON n.list_id=l.list_id\n      WHERE l.user_id=?\n      AND l.game_id=?\n    ";
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, database.execute(query, [uid, gid])];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        database.close();
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    },
    getReviews: function (options) {
        return new Promise(function (res, rej) {
            var database = new database_1.Database();
            var params = [];
            var where = '';
            if (options.game_id) {
                params.push(options.game_id);
            }
            if (options.user_id) {
                params.push(options.user_id);
            }
            if (options.id) {
                params.push(options.id);
            }
            if (options.page !== undefined) {
                params.push(options.page);
                params.push(options.limit);
            }
            var isAdmin = false;
            var query = "\n      SELECT r.*, u.name user_name, g.name game_name\n      FROM rating r\n      JOIN user u ON r.user_id=u.id\n      JOIN game g on r.game_id=g.id\n      WHERE 1=1\n      " + (options.game_id ? ' AND r.game_id = ? ' : '') + "\n      " + (options.user_id ? ' AND r.user_id = ? ' : '') + "\n      " + (options.id ? ' AND r.id = ? ' : '') + "\n      " + (isAdmin ? '' : ' AND r.removed=0 ') + "\n      ORDER BY r.date_created DESC\n      " + (options.page !== undefined ? ' LIMIT ?,? ' : '') + "\n    ";
            database.query(query, params)
                .then(res)
                .then(function () { return database.close(); })
                .catch(function (err) {
                database.close();
                rej(err);
            });
        });
    },
    getGame: function (id, database) {
        return new Promise(function (res, rej) {
            var db = database || new database_1.Database();
            var query = "\n        SELECT g.*\n            , AVG(r.rating) AS rating\n            , AVG(r.difficulty) AS difficulty \n        FROM game g \n        JOIN rating r ON r.game_id = g.id AND r.removed = 0\n        WHERE g.id = ?\n      ";
            db.query(query, [id])
                .then(res)
                .then(function () { return db.close(); })
                .catch(function (err) {
                db.close();
                rej(err);
            });
        });
    },
    getRandomGame: function () {
        var _this = this;
        return new Promise(function (res, rej) {
            var database = new database_1.Database();
            var query = "\n        SELECT COUNT(*) AS cnt FROM Game \n        WHERE removed=0 AND url != '' AND url IS NOT NULL\n      ";
            var query2 = "\n        SELECT id FROM Game \n        WHERE removed=0 AND url != '' AND url IS NOT NULL \n        LIMIT 1 OFFSET ?\n      ";
            database.query(query)
                .then(function (rows) { return database.query(query2, [Math.floor(+rows[0].cnt * Math.random())]); })
                .then(function (rows) { return _this.getGame(rows[0].id, database).then(res).catch(rej); });
        });
    }
};
