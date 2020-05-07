FROM node:12

#work from /app
RUN mkdir -p /app/node_modules && chown -R node:node /app
WORKDIR /app

#npm install in base layer - don't have to do this again unless you install new stuff!
COPY package*.json ./
USER node
RUN npm install

COPY --chown=node:node nodemon.json .
COPY --chown=node:node tsconfig.json .
COPY --chown=node:node typings ./typings
#COPY --chown=node:node src ./src

EXPOSE 4201

CMD ["npm", "run", "start"]