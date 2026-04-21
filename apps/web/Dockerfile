# syntax=docker/dockerfile:1
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json ./tsconfig.base.json

# Copy package manifests for workspace packages
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# Build shared package first
RUN pnpm --filter @crypto-edge/shared build

# Build Nuxt app as static SPA
WORKDIR /app/apps/web
ENV NUXT_TELEMETRY_DISABLED=1
ENV NITRO_PRESET=static
RUN pnpm nuxt prepare && pnpm nuxt generate

# Production stage - serve static files with nginx
FROM nginx:alpine AS prod
COPY --from=builder /app/apps/web/.output/public /usr/share/nginx/html

# Add nginx config for SPA fallback
RUN echo 'server { listen 80; location / { try_files $uri $uri/ /index.html; root /usr/share/nginx/html; } }' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
