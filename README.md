# Private Crypto Edge System V1

A strictly type-safe pnpm monorepo for a private crypto decision-support system.

## Stack
- `apps/api`: NestJS + Prisma + Swagger + BullMQ scaffolding + Telegram scaffolding
- `apps/web`: Nuxt 3 dashboard
- `packages/shared`: shared enums, contracts, and helpers
- Docker compose for Postgres + Redis + app services

## Quick start
1. Copy env files:
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env`
2. Start infra:
   - `docker compose up -d postgres redis`
3. Install deps:
   - `pnpm install`
4. Generate Prisma client:
   - `pnpm db:generate`
5. Run migration locally if desired:
   - `pnpm --filter @crypto-edge/api prisma:migrate:dev`
6. Start apps:
   - `pnpm dev`

## Services
- API: `http://localhost:3001/api`
- Swagger: `http://localhost:3001/docs`
- Web: `http://localhost:3000`

## Validation
- `pnpm build`
- `pnpm test`
- `pnpm typecheck`

## Notes
- External ingestion adapters are scaffolded with a manual-first MVP flow.
- Telegram delivery is env-driven and degrades safely when credentials are missing.
- Prisma schema and initial migration are included.
