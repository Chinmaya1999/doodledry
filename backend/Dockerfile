FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN mkdir -p uploads/designs

EXPOSE 5000

CMD ["node", "src/server.js"]
