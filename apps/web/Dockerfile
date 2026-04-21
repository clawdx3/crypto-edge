# syntax=docker/dockerfile:1
FROM node:20-slim AS builder

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./tsconfig.base.json
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

RUN pnpm --filter @crypto-edge/shared build

WORKDIR /app/apps/web
ARG NUXT_APP_BASE_URL=/crypto-edge
ARG NUXT_PUBLIC_API_BASE_URL=/crypto-edge
ENV NUXT_TELEMETRY_DISABLED=1
ENV NITRO_PRESET=static
ENV NUXT_APP_BASE_URL=${NUXT_APP_BASE_URL}
ENV NUXT_PUBLIC_API_BASE_URL=${NUXT_PUBLIC_API_BASE_URL}
RUN pnpm nuxt generate

FROM nginx:alpine AS prod
COPY --from=builder /app/apps/web/.output/public /usr/share/nginx/html
RUN rm -f /usr/share/nginx/html/index.html /usr/share/nginx/html/placeholder.html 2>/dev/null || true && \
    echo 'server { listen 80; root /usr/share/nginx/html; index 200.html; location / { try_files $uri $uri/ /200.html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
