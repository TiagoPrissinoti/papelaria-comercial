FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app
COPY package*.json ./
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:20-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --omit=dev
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

EXPOSE 3333
CMD ["npm", "start"]
