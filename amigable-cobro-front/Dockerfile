FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

# Build the client production bundle and the server typescript files
RUN npm run build

EXPOSE 3003

ENV PORT=3003
ENV NODE_ENV=development

CMD ["npm", "run", "dev:server"]
