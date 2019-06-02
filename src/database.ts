
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

  static async init() {
    let connection;

    try {
      connection = mysql.createConnection({
        host: config.db_host,
        user: config.db_user,
        password: config.db_password
      });

      await this.createDatabase(connection);
      await this.createUserTable(connection);
      await this.createGameTable(connection);
      await this.createRatingTable(connection);
      await this.createMessageTable(connection);
      await this.createLikeReviewTable(connection);
      await this.createListTable(connection);
      await this.createListGameTable(connection);
      await this.createScreenshotTable(connection);
      await this.createNewsTable(connection);
      await this.createReportTable(connection);
      await this.createUserFollowTable(connection);
    } finally {
      if (connection) connection.end()
    }
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

  static createGameTable(connection: mysql.Connection) {
    console.log('Creating game table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.Game (
        id int(11) NOT NULL AUTO_INCREMENT,
        name varchar(200) NOT NULL,
        sortname varchar(150) NOT NULL,
        url varchar(400) CHARACTER SET latin1 DEFAULT NULL,
        url_spdrn varchar(400) DEFAULT NULL,
        author varchar(300) DEFAULT NULL,
        collab tinyint(1) NOT NULL DEFAULT '0',
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        adder_id int(11) DEFAULT NULL,
        removed tinyint(1) NOT NULL DEFAULT '0',
        owner_id int(11) DEFAULT NULL,
        owner_bio varchar(5000) DEFAULT NULL,
        PRIMARY KEY (id),
        KEY removed (removed),
        KEY date_created (date_created)
      ) ENGINE=MyISAM DEFAULT CHARSET=utf8;
      
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createRatingTable(connection: mysql.Connection) {
    console.log('Creating rating table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.Rating (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id int(11) NOT NULL,
        game_id int(11) NOT NULL,
        rating tinyint(4) DEFAULT NULL,
        difficulty tinyint(4) DEFAULT NULL,
        comment text,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        removed tinyint(1) NOT NULL DEFAULT '0',
        PRIMARY KEY (id),
        UNIQUE KEY idk_ug (user_id,game_id),
        KEY game_id (removed,game_id),
        KEY review_date (date_created),
        KEY idx_gid_rem (game_id,removed)
      ) ENGINE=MyISAM DEFAULT CHARSET=utf8;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createMessageTable(connection: mysql.Connection) {
    console.log('Creating message table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.Message (
        id int(11) NOT NULL AUTO_INCREMENT,
        is_read tinyint(1) NOT NULL DEFAULT '0',
        user_from_id int(11) NOT NULL,
        user_to_id int(11) NOT NULL,
        subject varchar(100) NOT NULL,
        body text NOT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        deleted tinyint(1) NOT NULL DEFAULT '0',
        reply_to_id int(11),
        thread_id int(11),
        PRIMARY KEY (id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createLikeReviewTable(connection: mysql.Connection) {
    console.log('Creating like review table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.LikeReview (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id int(11) NOT NULL,
        rating_id int(11) NOT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY lr_ur (rating_id,user_id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createListTable(connection: mysql.Connection) {
    console.log('Creating list table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.List (
        id int(11) NOT NULL AUTO_INCREMENT,
        user_id int(11) NOT NULL,
        name varchar(200) NOT NULL,
        description text,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY user_id (user_id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createListGameTable(connection: mysql.Connection) {
    console.log('Creating list game table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.ListGame (
        list_id int(11) NOT NULL,
        game_id int(11) NOT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (list_id,game_id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createScreenshotTable(connection: mysql.Connection) {
    console.log('Creating screenshot table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.Screenshot (
        id int(11) NOT NULL AUTO_INCREMENT,
        game_id int(11) NOT NULL,
        added_by_id int(11) NOT NULL,
        approved_by_id int(11) DEFAULT NULL,
        description varchar(100) CHARACTER SET utf8 NOT NULL,
        approved tinyint(1) DEFAULT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        removed tinyint(1) NOT NULL DEFAULT '0',
        PRIMARY KEY (id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createNewsTable(connection: mysql.Connection) {
    console.log('Creating news table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.News (
        id int(11) NOT NULL AUTO_INCREMENT,
        poster_id int(11) NOT NULL,
        title varchar(100) CHARACTER SET utf8 NOT NULL,
        short text CHARACTER SET utf8 NOT NULL,
        news text CHARACTER SET utf8 NOT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createReportTable(connection: mysql.Connection) {
    console.log('Creating report table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.Report (
        id int(11) NOT NULL AUTO_INCREMENT,
        type varchar(50) CHARACTER SET utf8 NOT NULL,
        target_id int(11) NOT NULL,
        report varchar(2000) CHARACTER SET utf8 NOT NULL,
        reporter_id int(11) NOT NULL,
        answered_by_id int(11) DEFAULT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        date_answered timestamp NULL DEFAULT NULL,
        PRIMARY KEY (id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }

  static createUserFollowTable(connection: mysql.Connection) {
    console.log('Creating user follow table...')
    return new Promise((resolve,reject) => {
      connection.query(`
      CREATE TABLE IF NOT EXISTS delfruit.UserFollow (
        user_id int(11) NOT NULL,
        user_follow_id int(11) NOT NULL,
        date_created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id,user_follow_id)
      ) ENGINE=MyISAM DEFAULT CHARSET=latin1;
      `,[],(err,rows)=>{
        if (err) reject(err);
        else resolve();
      });
    });
  }
}



