# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile
COPY . .
RUN cd packages/shared && pnpm build
RUN cd apps/api && npx prisma generate && pnpm build
RUN pnpm deploy --filter=@crypto-edge/api --prod /tmp/deploy-api

FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /tmp/deploy-api /app
RUN npm install -g prisma@6.6.0 && npx prisma generate
EXPOSE 3001
CMD ["node", "dist/main.js"]
