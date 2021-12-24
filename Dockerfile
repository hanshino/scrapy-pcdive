FROM node:lts

LABEL maintainer="hanshino@github"

WORKDIR /app

COPY ./package.json ./
COPY ./yarn.lock ./

RUN yarn install

COPY ./index.js ./

RUN curl -sO https://raw.githubusercontent.com/hanshino/redive_linebot/master/app/doc/characterInfo.json

CMD ["yarn", "start"]