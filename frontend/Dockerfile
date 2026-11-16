# syntax=docker/dockerfile:1.7
FROM node:26-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY . .
# Vite incrusta las variables VITE_* al compilar: deben llegar como build arg,
# no como variable de entorno del contenedor. Por defecto se usa el proxy /api de nginx.
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# nginx-unprivileged corre como UID 101 y escucha en 8080 (sin root ni puertos < 1024).
FROM nginxinc/nginx-unprivileged:1.28-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null || exit 1
CMD ["nginx", "-g", "daemon off;"]
