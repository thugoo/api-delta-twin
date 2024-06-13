FROM node:18-alpine

WORKDIR /api-delta-twin

COPY package*.json ./

RUN npm install

COPY . /api-delta-twin

RUN npm install pm2 -g

ENV CLIENT_DOMAIN=${CLIENT_DOMAIN}

CMD ["pm2-runtime", "start", "ecosystem.config.js"]