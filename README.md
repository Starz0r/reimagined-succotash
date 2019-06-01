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
For local development, you should start up a mysql instance and the server, and put them on the same network.

Auto-redeployment and breakpoint support are included through the use of nodemon and ts-node.

## Start the app

* Of course, always run `npm i` before starting to get your node modules
* To run the development monitor: `npm run dev`
* To run the app without the monitor: `npm run start`
* To run the app with pure node, not ts-node: `tsc && npm run start-plain`

## Test the app

Once the app and database are running and connected, you can run the integration tests with `npm run test`

To start the database:

```
docker run --network=df-network --net=host -e MYSQL_ROOT_PASSWORD=my-secret-pw --name test-mysql -d mysql:latest mysqld --default-authentication-plugin=mysql_native_password
```

To find the database IP for Windows: `ipconfig /all` and find DockerNAT, the IP will be something like 10.0.75.1. The mysql IP will be 10.0.75.2 (yeah I know, totally obvious)

For linux, it's just the host IP. ezpz

# Production Deployment
For a production-like environment, you may spin up as many instances of the server as desired, as the server is stateless. This will allow the application to scale with request volume. The bottleneck then lies at the mysql instance.


# Docker Commands

## Build the server
docker build -t delfruit-server .

## Create the network
docker network create -d bridge df-network

## Start mysql
docker run --network=df-network --network df-network -e MYSQL_ROOT_PASSWORD=my-secret-pw  -d mysql:latest mysqld --default-authentication-plugin=mysql_native_password

## Start the app
docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server

## Rebuild and redeploy
docker build -t delfruit-server . && docker kill df-server && docker rm df-server && docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server