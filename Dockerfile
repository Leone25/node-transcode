# sticking with node 18 because of some issue with weirdly formatted http requests in newer versions
FROM node:18

EXPOSE 3000

RUN apt update && apt install -y ffmpeg

WORKDIR /usr/src

COPY package.json ./

RUN npm i --prefix /usr/src/

WORKDIR /usr/src/app

COPY . .

ENV NODE_PATH=/usr/src/node_modules

CMD  ["npm", "run", "start"]