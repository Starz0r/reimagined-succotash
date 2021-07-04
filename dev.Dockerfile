FROM node:10

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

RUN apk add --no-cache curl

WORKDIR /home/node/app

COPY package*.json ./

USER node

RUN npm install

COPY --chown=node:node . .

RUN cp ./src/config/config.dev.json ./src/config/config.json

EXPOSE 4201

CMD ["npm", "run", "start"]