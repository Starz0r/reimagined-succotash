
const mysql = require('mysql');
const config = require('./config');

class Database {
  constructor() {
    this.connection = mysql.createConnection({
      host: config.db_host,
      database: config.db_database,
      user: config.db_user,
      password: config.db_password
    });
  }

  query(sql,args) {
    return new Promise((resolve,reject) => {
      this.connection.query(sql,args,(err,rows)=>{
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve,reject) => {
      this.connection.end(err => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = Database;