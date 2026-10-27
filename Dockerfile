FROM node:22

WORKDIR /api

COPY package*.json ./

RUN npm ci

COPY . .

EXPOSE 3000
