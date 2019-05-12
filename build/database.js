"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var mysql_1 = __importDefault(require("mysql"));
var config_1 = __importDefault(require("./config/config"));
var Database = /** @class */ (function () {
    function Database() {
        this.connection = mysql_1.default.createConnection({
            host: config_1.default.db_host,
            database: config_1.default.db_database,
            user: config_1.default.db_user,
            password: config_1.default.db_password
        });
    }
    Database.prototype.query = function (sql, args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.query(sql, args, function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    };
    Database.prototype.execute = function (sql, args) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.query(sql, args, function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    };
    Database.prototype.close = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.connection.end(function (err) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    };
    Database.init = function () {
        var _this = this;
        var connection = mysql_1.default.createConnection({
            host: config_1.default.db_host,
            user: config_1.default.db_user,
            password: config_1.default.db_password
        });
        return this.createDatabase(connection)
            .then(function () { return _this.createUserTable(connection); })
            .then(function () { return connection.end(); });
    };
    Database.createDatabase = function (connection) {
        console.log('Creating database...');
        return new Promise(function (resolve, reject) {
            connection.query("\nCREATE DATABASE IF NOT EXISTS delfruit;\n      ", [], function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    };
    Database.createUserTable = function (connection) {
        console.log('Creating user table...');
        return new Promise(function (resolve, reject) {
            connection.query("\nCREATE TABLE IF NOT EXISTS delfruit.User (\n  id int(11) NOT NULL AUTO_INCREMENT,\n  name varchar(50) CHARACTER SET latin1 NOT NULL,\n\n  phash varchar(128) CHARACTER SET latin1 DEFAULT NULL,\n  salt varchar(100) DEFAULT NULL,\n  \n  phash2 varchar(255) DEFAULT NULL,\n\n  email varchar(100) CHARACTER SET latin1 DEFAULT NULL,\n  date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  date_last_login timestamp DEFAULT NULL,\n\n  last_ip varchar(40) CHARACTER SET latin1 DEFAULT NULL,\n  unsuccessful_logins int(11) NOT NULL DEFAULT '0',\n\n  is_admin tinyint(1) NOT NULL DEFAULT '0',\n  can_report tinyint(1) NOT NULL DEFAULT '1',\n  can_submit tinyint(1) NOT NULL DEFAULT '1',\n  can_review tinyint(1) NOT NULL DEFAULT '1',\n  can_screenshot tinyint(1) NOT NULL DEFAULT '1',\n  can_message tinyint(1) NOT NULL DEFAULT '1',\n  banned tinyint(1) NOT NULL DEFAULT '0',\n\n  twitch_link varchar(50) DEFAULT NULL,\n  nico_link varchar(50) DEFAULT NULL,\n  youtube_link varchar(50) DEFAULT NULL,\n  twitter_link varchar(50) DEFAULT NULL,\n\n  bio TEXT DEFAULT NULL,\n  \n  ali_token varchar(300) DEFAULT NULL,\n  ali_date_set timestamp NULL DEFAULT NULL,\n\n  reset_token varchar(255) DEFAULT NULL,\n  reset_token_set_time timestamp NULL DEFAULT NULL,\n\n  locale char(5) NOT NULL DEFAULT 'en_US',\n\n  PRIMARY KEY (id),\n  UNIQUE KEY name_2 (name),\n  KEY banned (banned)\n) ENGINE=MyISAM DEFAULT CHARSET=utf8;\n      \n      ", [], function (err, rows) {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    };
    return Database;
}());
exports.Database = Database;
