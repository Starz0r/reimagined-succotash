#Build the server
docker build -t delfruit-server .

#Create the network
docker network create -d bridge df-network

#Start mysql
docker run --network=df-network --name df-mysql -e MYSQL_ROOT_PASSWORD=my-secret-pw -d mysql:latest

#Start the app
docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server

#Rebuild and redeploy
docker build -t delfruit-server . && docker kill df-server && docker rm df-server && docker run -d --name df-server --network df-network -p 4201:4201 -v D:\Projects\delfruit2-server\config:/home/node/app/config delfruit-server