export = {
  db_host: "localhost",
  db_database: "delfruit",
  db_user: "root",
  db_password: "",
  db_port: 3306,
  app_port: 4201,
  app_jwt_secret: 'what_up_fam',

  s3_host:"",
  s3_port:9000,
  s3_ssl: true,
  s3_access:"",
  s3_secret:"",

  smtp: {    
    host: "smtp.example.com",
    port: 587,
    secure: true,
    auth: {
      user:"user",
      pass:"p4ssw0rd",
    }
  },
  
  recaptcha_threshold: 0,
  recaptcha_secret: '',

  memcache: {
    hosts:['memcache:11211']
  }
}