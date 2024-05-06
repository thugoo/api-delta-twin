FROM node:18-alpine

WORKDIR /api_delta_twin

COPY package*.json ./

RUN npm install

COPY . /api_delta_twin

RUN npm install pm2 -g

ENV CLIENT_DOMAIN=${CLIENT_DOMAIN}

CMD ["pm2-runtime", "start", "ecosystem.config.js"]