FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY tsconfig.json ./
# For dev, nodemon and ts-node are installed
CMD ["npm", "run", "dev"]

FROM node:20-alpine AS prod

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["npm", "start"]
