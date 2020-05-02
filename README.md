# Delicious-Fruit Server 2.0
This project is the second iteration of Delfruit, which brings the application into the modern era!

* Built on Typescript and Node.js
* REST-compliant API
* Stateless and scalable
* MySQL 8.0 support
* Dockerized
* Automated tests
* Not PHP 🙂

This project goes hand-in-hand with the df-client project, which is the Angular frontend for the Delfruit website. They are kept separate to allow the client to be compiled and deployed on a CDN without bulking up the server project.

# Local Development
For local development, you should start up a mysql instance, minio instance, and the server, and put them on the same network.

Auto-redeployment and breakpoint support are included through the use of nodemon and ts-node.

## Mysql Test Instance

To start the database for testing:

```
docker run \
  -e MYSQL_ROOT_PASSWORD=my-secret-pw \
  -p 3306:3306 \
  --name df2-mysql -d mysql:latest \
  mysqld --default-authentication-plugin=mysql_native_password
```

Then you can connect on localhost port 3306.

## Minio Test Instance

Delfruit uses an S3-compliant object storage service for storing uploaded content. For local development, you can use a Minio server.

```
docker run -p 9000:9000 minio/minio server /data
```

## Start the app

* Of course, always run `npm i` before starting to get your node modules
* To run the development monitor: `npm run dev`
* To run the app without the monitor: `npm run start`
* To run the app with pure node, not ts-node: `tsc && npm run start-plain`

## Test the app

Once the app and database are running and connected, you can run the integration tests with `npm run test-int`

# Production Deployment
For a production-like environment, you may spin up as many instances of the server as desired, as the server is stateless. This will allow the application to scale with request volume. The bottleneck then lies at the mysql instance.


# Docker Commands

This stuff might be a little outdated, see coreos tutorial below

## Build the server
```
docker build -t delfruit-server .
```

## Create the network
```
docker network create -d bridge df-network
```

## Start mysql
```
docker run --network=df-network --network df-network -e MYSQL_ROOT_PASSWORD=my-secret-pw  -d mysql:latest mysqld --default-authentication-plugin=mysql_native_password
```

## Start the app
```
docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server
```

## Rebuild and redeploy
```
docker build -t delfruit-server . && docker kill df-server && docker rm df-server && docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server
```

# Starting from scratch in coreos

## Create swapfile
https://coreos.com/os/docs/latest/adding-swap.html

## Login to docker
Log in with an account that has access to my repo on docker.io
```
docker login
```

## Start minio
keys are keyboard mashings, but don't use a dollar sign! fucks up in linux
```
docker run -p 9000:9000 --name minio \
  -e "MINIO_ACCESS_KEY=AKKAIOSSFROD3NN7EXAMPSLE" \
  -e "MINIO_SECRET_KEY=wJala4rXUtnFf#jEMI/K77645MDEgfsdNG/bPxRfliCY" \
  -v /mnt/data:/data \
  minio/minio server /data
```

## Start mysql
password is keyboard mashing, but don't use a dollar sign! fucks up in linux
```
docker run -p 3306:3306 \
  -v /mnt/mysql:/var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD=U0yBVBSKdnnEGoAXLRxc \
  --name mysql -d mysql:latest \
  mysqld --default-authentication-plugin=mysql_native_password
```

## Import database
Copy a delfruit backup over via winscp
```
docker exec -i mysql mysql -u root -pU0yBVBSKdnnEGoAXLRxc delfruit < delfruit.sql
```

## Migrate datatypes
```sql
docker exec -i mysql mysql -u root -pU0yBVBSKdnnEGoAXLRxc

-- allow non-local connections
GRANT ALL ON *.* to user@'%'

-- don't freak out at zero dates
SET SESSION sql_mode = '';

USE delfruit;

-- alter phash, salt
ALTER TABLE User MODIFY phash varchar(128) DEFAULT NULL;
ALTER TABLE User MODIFY salt varchar(100) DEFAULT NULL;
ALTER TABLE User MODIFY date_last_login timestamp DEFAULT NULL;
UPDATE User SET date_last_login='2001-01-01 00:00:00' WHERE date_last_login<'2001-01-01 00:00:00';
-- clear sensitive data
UPDATE User SET email='';
UPDATE User SET phash2='';
UPDATE User SET last_ip='';
```

## Setup Server Config

```
mkdir config
vim config/config.ts
```

```ts
export = {
  db_host: "", //ip of droplet
  db_database: "delfruit",
  db_user: "root",
  db_password: "", //keyboard mashings from above
  app_port: 4201,
  app_jwt_secret: '', //keyboard mashings

  s3_host:"", //ip of droplet
  s3_port:9000,
  s3_ssl: false,
  s3_access:"", //keyboard mashings from above
  s3_secret:"", //keyboard mashings from above
  s3_bucket:"df2images",
  s3_region:"us-east-1"
}
```

## Start server

```
docker run -d --name df-server -p 4201:4201 \
-v /home/core/config:/home/node/app/src/config klazen108/df2-server
```

## Start client
proxy needs to be configured correctly
```
docker run -d --name df-client -p 80:80 klazen108/df2-client
```