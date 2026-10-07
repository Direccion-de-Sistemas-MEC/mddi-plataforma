# Imagen única: compila la interfaz y ejecuta el backend (que la sirve)
FROM node:22-alpine AS frontend
WORKDIR /app
COPY shared ./shared
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci
COPY frontend ./frontend
RUN cd frontend && npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY shared ./shared
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend ./backend
COPY --from=frontend /app/frontend/dist ./frontend/dist
USER node
EXPOSE 8080
CMD ["node", "backend/src/server.js"]
