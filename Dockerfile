FROM node:22

WORKDIR /api

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000
#CMD ["tail", "-f", "/dev/null"]