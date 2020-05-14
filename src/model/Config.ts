import mysql from 'mysql';
import * as Minio from 'minio';

export default interface Config {
  db: mysql.ConnectionConfig;

  app_port: number;
  app_jwt_secret: string;

  s3: Minio.ClientOptions;
  s3_bucket:string;
  s3_region:string;

  smtp: {    
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    }
  },
  recaptcha_threshold: number;
  recaptcha_secret: string;

  memcache: {
    hosts: string[];
    /** options from https://www.npmjs.com/package/memcached */
    options: {
      maxExpiration: number
    }
  }
}