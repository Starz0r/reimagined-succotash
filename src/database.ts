
import mysql from 'mysql';
import config from './config/config';

export class Database {
  private connection: mysql.Connection;

  constructor() {
    this.connection = mysql.createConnection({
      host: config.db_host,
      database: config.db_database,
      user: config.db_user,
      password: config.db_password
    });
  }

  query(sql: string, args?: any[]): Promise<any[]> {
    return new Promise((resolve,reject) => {
      this.connection.query(sql,args,(err,rows)=>{
        if (err) reject(err);
        else resolve(rows as any[]);
      });
    });
  }

  execute(sql: string, args?: any[]): Promise<any> {
    return new Promise((resolve,reject) => {
      this.connection.query(sql,args,(err,rows)=>{
        if (err) reject(err);
        else resolve(rows as any);
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

  static init() {
    var connection = mysql.createConnection({
      host: config.db_host,
      user: config.db_user,
      password: config.db_password
    })

    return this.createDatabase(connection)
      .then(() => this.createUserTable(connection))
      .then(() => connection.end());
  }

  static createDatabase(connection: mysql.Connection) {
    console.log('Creating database...')
    return new Promise((resolve,reject) => {
      connection.query(`
CREATE DATABASE IF NOT EXISTS delfruit;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createUserTable(connection: mysql.Connection) {
    console.log('Creating user table...')
    return new Promise((resolve,reject) => {
      connection.query(`
CREATE TABLE IF NOT EXISTS delfruit.User (
  id int(11) NOT NULL AUTO_INCREMENT,
  name varchar(50) CHARACTER SET latin1 NOT NULL,

  phash varchar(128) CHARACTER SET latin1 DEFAULT NULL,
  salt varchar(100) DEFAULT NULL,
  
  phash2 varchar(255) DEFAULT NULL,

  email varchar(100) CHARACTER SET latin1 DEFAULT NULL,
  date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_last_login timestamp DEFAULT NULL,

  last_ip varchar(40) CHARACTER SET latin1 DEFAULT NULL,
  unsuccessful_logins int(11) NOT NULL DEFAULT '0',

  is_admin tinyint(1) NOT NULL DEFAULT '0',
  can_report tinyint(1) NOT NULL DEFAULT '1',
  can_submit tinyint(1) NOT NULL DEFAULT '1',
  can_review tinyint(1) NOT NULL DEFAULT '1',
  can_screenshot tinyint(1) NOT NULL DEFAULT '1',
  can_message tinyint(1) NOT NULL DEFAULT '1',
  banned tinyint(1) NOT NULL DEFAULT '0',

  twitch_link varchar(50) DEFAULT NULL,
  nico_link varchar(50) DEFAULT NULL,
  youtube_link varchar(50) DEFAULT NULL,
  twitter_link varchar(50) DEFAULT NULL,

  bio TEXT DEFAULT NULL,
  
  ali_token varchar(300) DEFAULT NULL,
  ali_date_set timestamp NULL DEFAULT NULL,

  reset_token varchar(255) DEFAULT NULL,
  reset_token_set_time timestamp NULL DEFAULT NULL,

  locale char(5) NOT NULL DEFAULT 'en_US',

  PRIMARY KEY (id),
  UNIQUE KEY name_2 (name),
  KEY banned (banned)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
      
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }
}