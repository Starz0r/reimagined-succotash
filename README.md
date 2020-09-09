# Delicious-Fruit Server 2.0
This project is the second iteration of Delfruit, which brings the application into the modern era!

[![Build Status](https://travis-ci.com/Klazen108/delfruit2-server.svg?token=aSsK6e8aPhD8C4qg6qwK&branch=master)](https://travis-ci.com/Klazen108/delfruit2-server)

* Built on Typescript and Node.js
* REST-compliant API
* Stateless and scalable
* MySQL 8.0 support
* performant caching using memcached
* Dockerized
* Automated tests
* Not PHP 🙂

This project goes hand-in-hand with the df-client project, which is the Angular frontend for the Delfruit website. They are kept separate to allow the client to be compiled and deployed on a CDN without bulking up the server project.

# Quickstart

Have docker, and want to spin up a quick instance for testing and development? It's dead simple!

```sh
# use dev config 
cp src/config/config_dev.ts src/config/config.ts
# start mysql, minio, memcached, and the app!
docker-compose up
```

View the API docs at: http://localhost:4201/api/swagger/

This command runs using `ts-node-dev` in watch mode, so changes to the server are immediately recompiled and picked up by the server.

## Integration Testing

Once the server is up and running, you can use the following to run an integration test on all the services to ensure that everything works as intended. As a bonus, this will opulate the database with dummy data for you to test with!

```sh
npm run test-int
```

## How can I view the database?

```sh
docker exec -it delfruit2-server_mysql_1 mysql -u root -password=my-secret-pw delfruit
```

(of course, change the password/database if you've changed them in your config, but these are the defaults for local development)

# Local Development (old)
If you don't have or want to use docker, you can still run the server, but you will need to spin up all the dependencies yourself.

For local development, you should start up a mysql instance, minio instance, memcached instance, and the server, and put them on the same network.

Auto-redeployment and breakpoint support are included through the use of nodemon and ts-node.

## Mysql Test Instance

To start the database for testing via docker:

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

To start the minio server for testing via docker:

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

copy `config_dev.ts` and modify accordingly

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
