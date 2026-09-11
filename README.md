# Kitchenstabuk

Arabic-first local service and lead-generation platform for Saudi Arabia. The
repository is a pnpm/Turborepo monorepo and is being delivered in explicit
phases. Phases 1–3 establish the application boundaries, configuration, API
hardening, local infrastructure, complete relational model, migrations,
repeatable Arabic development data, and secure administrative access.

## Workspace

- `apps/web` — public Next.js website on port `3000`
- `apps/admin` — protected Next.js administration app on port `3001`
- `apps/api` — NestJS API on port `4000`, globally prefixed with `/api`
- `packages/database` — Prisma schema and PostgreSQL client
- `packages/ui` — shared React components
- `packages/types` — shared transport-safe TypeScript types
- `packages/validation` — shared Zod validation
- `packages/config` — locale and platform constants

The default product locale is `ar-SA`, direction is RTL, currency is SAR, and
timezone is `Asia/Riyadh`.

## Requirements

- Node.js 24 or newer
- pnpm 11.25.0
- Docker with Compose

## Local setup

```bash
cp .env.example .env
cp .env.example apps/api/.env
pnpm install
docker compose up -d postgres redis
pnpm db:migrate:deploy
pnpm db:seed
pnpm dev
```

Open the public site at `http://localhost:3000`, admin at
`http://localhost:3001`, API health at `http://localhost:4000/api/health`, and
Swagger during development at `http://localhost:4000/api/docs`.

## Quality commands

```bash
pnpm lint
pnpm check-types
pnpm test
E2E_DATABASE_URL="$DATABASE_URL" pnpm --filter api test:e2e
pnpm build
pnpm db:format
pnpm db:validate
pnpm db:verify
```

## Database workflow

Prisma uses PostgreSQL through the `@prisma/adapter-pg` driver adapter. The
schema covers the service catalogue, Saudi location hierarchy, dynamic request
fields and answers, lead workflow, RBAC, CMS, media, settings, analytics, and
audit records.

Create a named development migration after changing the schema:

```bash
pnpm --filter database exec prisma migrate dev --name describe_the_change
```

Apply committed migrations in production without creating new ones:

```bash
pnpm db:migrate:deploy
```

The development seed requires `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PHONE`, and
`ADMIN_SEED_PASSWORD`. It is idempotent and may be run repeatedly:

```bash
pnpm db:seed
pnpm db:verify
```

## Environment

Copy `.env.example` for local development and replace every secret placeholder.
Production startup validates critical API variables. Never commit real `.env`
files or expose backend secrets through `NEXT_PUBLIC_` variables.

## Administrative access

The seed creates or updates the initial super administrator from
`ADMIN_SEED_EMAIL`, `ADMIN_SEED_PHONE`, and `ADMIN_SEED_PASSWORD`. Sign in at
`http://localhost:3001/login` with either identifier. Access and rotating
refresh tokens are stored only in HttpOnly cookies; the companion CSRF cookie
must match the request header for refresh and logout operations.

For production subdomains, set `AUTH_COOKIE_DOMAIN` to the shared parent domain
and leave `AUTH_COOKIE_SECURE` unset (secure cookies are the production
default). API authorization is deny-by-default and permission checks are
enforced on the server.

## Delivery phases

1. Foundation and workspace repair — complete
2. Database models, migrations, and Arabic development seed — complete
3. Admin authentication, session rotation, RBAC, and audit logging — complete
4. Admin catalogue, locations, dynamic fields, and media — implemented; browser and media-flow verification pending
5. Arabic public website and location-aware service discovery — homepage, filters, and service details implemented; browser review pending
6. Service request workflow, tracking, attachments, and notifications
7. CMS, SEO, structured data, sitemap, and redirects
8. Security, accessibility, performance, Docker, and deployment hardening

## Development checkpoint — 2026-09-11

The public homepage now reads live catalogue data, supports Arabic search,
category and city filters, and pagination, and links to service detail pages.
Public endpoints under `/api/catalogue` expose active services in active
categories only. City filtering also checks active location ancestors and districts.
The website shows explicit empty and unavailable states when appropriate.
Set `API_INTERNAL_URL` to the API base URL (including `/api`) when server-side
requests need a different address from `NEXT_PUBLIC_API_URL`.

Catalogue verification fixed partial price validation, pricing-mode changes,
field type/option validation, and the city-wide service coverage scope key.
Express is now declared as a direct API runtime dependency.

Verified: 12 unit tests, 4 database-backed integration tests, workspace type
checks, lint, production builds, and development seed verification. Integration
coverage includes authentication rotation/replay/logout, catalogue creation,
invalid updates, city coverage, anonymous admin denial, and public visibility.
Live HTTP smoke checks also passed for homepage rendering with database services,
service details, and missing-service 404 responses. Browser interaction and
media upload/storage flows still need verification.
Customer request submission and tracking remain in Phase 6.
