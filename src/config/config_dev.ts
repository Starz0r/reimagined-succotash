export default {
  db_host: "mysql",
  db_database: "delfruit",
  db_user: "root",
  db_password: "my-secret-pw",
  db_port: 3306,
  app_port: 4201,
  app_jwt_secret: 'what_up_fam',

  s3_host:"minio",
  s3_port:9000,
  s3_ssl: false,
  s3_access:"minioadmin",
  s3_secret:"minioadmin",
  s3_bucket:"df2images",
  s3_region:"us-east-1",

  smtp: {    
    host: "",
    port: 587,
    secure: false,
    auth: {
      user:"",
      pass:"",
    }
  },

  /** recaptcha score threshold below which user actions will be considered sus 
   * 0-1
   */
  recaptcha_threshold: 0,
  /**
   * recaptcha secret key. if empty, is disabled. get from recaptcha dashboard
   */
  recaptcha_secret: '',

  memcache: {
    hosts:['memcache:11211'],
    /** options from https://www.npmjs.com/package/memcached */
    options: { 
      maxExpiration: 86400
    }
  }
}