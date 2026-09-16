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

## Production Docker deployment

The multi-stage [Dockerfile](Dockerfile) creates minimal, non-root runtime
images for the API, public site, and admin app. The production Compose file
keeps PostgreSQL and Redis on the private Docker network, persists database,
Redis, and local-upload data, waits for health checks, and applies Prisma
migrations before starting the API.

Create a production `.env` from `.env.example`, replace every placeholder, and
set public URLs to their HTTPS origins. At minimum, use long random JWT secrets,
strong PostgreSQL credentials, `AUTH_COOKIE_SECURE=true`, and set
`NEXT_PUBLIC_API_URL` to the externally reachable API origin (for example,
`https://api.example.com/api`). Then deploy with:

```bash
docker compose -f docker-compose.production.yml up -d --build
```

Only the web and admin ports are published. Put a TLS reverse proxy in front of
them and the API if it is served to browsers. For a database migration without
bringing up the whole stack, run `docker compose -f docker-compose.production.yml run --rm migrate`.

### Nginx on a VPS shared with another site

Use [deploy/nginx/kitchenstabuk.conf](deploy/nginx/kitchenstabuk.conf) as a
separate Nginx virtual host. Replace `example.com` and `admin.example.com` with
your domains. Nginx can keep using ports 80/443 for multiple sites; it chooses
the correct site by `server_name`, so this does not conflict with an existing
domain. The application containers use loopback-only ports by default:
`4400` (API), `3300` (website), and `3301` (admin). Change these in the
production `.env` if any is already in use:

```dotenv
API_PORT=4400
WEB_PORT=3300
ADMIN_PORT=3301
NEXT_PUBLIC_API_URL=https://example.com/api
NEXT_PUBLIC_SITE_URL=https://example.com
WEB_URL=https://example.com
ADMIN_URL=https://admin.example.com
CORS_ORIGINS=https://example.com,https://admin.example.com
AUTH_COOKIE_SECURE=true
```

Install the config, validate it, then reload Nginx:

```bash
sudo ln -s /path/to/kitchenstabuk/deploy/nginx/kitchenstabuk.conf /etc/nginx/sites-enabled/kitchenstabuk
sudo nginx -t && sudo systemctl reload nginx
```

Use Certbot (or your existing TLS setup) to add HTTPS certificates after the
HTTP virtual hosts are reachable.

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

## Arabic and English

The public site uses `/ar` and `/en` URLs. Old unprefixed links redirect to the
saved language (Arabic by default). The language toggle preserves the current
service, search, city/category filters, and pagination. Arabic uses RTL and
English uses LTR; prices remain in SAR. Public metadata includes a canonical URL
and alternate language links. Set `NEXT_PUBLIC_SITE_URL` to the public deployment
origin, and `API_INTERNAL_URL` to the API base URL when server-side traffic uses
an internal address.

The admin toggle changes the interface without navigating or remounting forms.
Its language is saved in the `kst_locale` cookie. Service and category forms have
independent Arabic/English content tabs; both stay mounted so switching tabs or
interface language preserves drafts. Existing field/option translations can be
edited in the dynamic-fields section. Location names and English metadata, and
media alternative text, can also be edited. Existing authentication and
permission checks still apply.

English content is stored separately from existing Arabic fields. The public
catalogue accepts `locale=ar|en`, searches both names, and falls back to the
Arabic value for each missing English translation. Service/category editors
identify incomplete translations. User-entered names and audit event identifiers
are retained as entered.

After pulling this change, apply the migration and fill missing development
translations (this command preserves existing English translations):

```bash
pnpm db:generate
pnpm db:migrate:deploy
pnpm --filter database db:seed:translations
pnpm dev
```

UI dictionaries and locale helpers live in `packages/i18n`. Add both language
versions when introducing a new label or content field. The full development
seed also fills English catalogue translations.

Language verification:

```bash
pnpm lint
pnpm check-types
pnpm test
pnpm build
node --env-file=.env scripts/verify-languages.cjs
```

The browser check uses a fresh headless Chrome profile, temporary local servers
on ports 3300, 3301, and 4300, and a temporary administrator removed afterward.
It needs the seeded local database and Chrome (`CHROME_BIN` can override the
executable). It checks translated pages, RTL/LTR, old links, alternate-language
metadata, 404s, filters, cookie persistence, login, unsaved forms, admin routes,
and mobile overflow. Database integration tests also verify English search,
localized responses, invalid locales, and per-field Arabic fallback.

## Customer reviews

Visitors can submit their name, email, optional city, a 1–5 rating, and a review
from the homepage in Arabic or English. Email addresses are stored for admin
review and never included in public responses. Submission does not require an
account or verify email ownership. New reviews are pending and hidden until an
administrator with `content.manage` approves them at `/reviews` in the admin app.
Admins can filter pending/approved/rejected submissions, publish, reject, return
to pending, or delete reviews. Moderation actions are recorded in the audit log.
Public submissions are limited to five attempts per minute per IP.

Apply `pnpm db:migrate:deploy`, regenerate with `pnpm db:generate`, and rebuild
the database package before starting the API. Existing active reviews are
preserved as approved by the migration. To check submission and moderation in
a browser with all local dev servers running:

```bash
node --env-file=.env scripts/verify-reviews.cjs
```

The check creates temporary review/admin records and removes them afterward.

## Image uploads and Cloudinary CDN

Category forms, service cover/gallery fields, and project before/after fields
support uploading files directly, previewing them, selecting existing library
images, and removing selections. Uploads go through the authenticated API with
file signature, image dimension, and configured size validation. Save the form
to attach its selected images; uploading alone adds an asset to the media library.
Users need `media.manage` to upload and the corresponding content permission to
save. Removing a selection detaches the image without deleting its library asset.

To enable Cloudinary, set these backend-only values in `apps/api/.env` (or your
API deployment environment):

```dotenv
UPLOAD_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_FOLDER=kitchenstabuk
```

Then apply `pnpm db:migrate:deploy`, run `pnpm db:generate`, rebuild with
`pnpm --filter database build`, and restart the API. New images use Cloudinary's
HTTPS CDN URLs. Existing assets keep their saved URLs and provider; keep local
uploads available if switching from local storage. The API signs uploads and
Cloudinary deletions on the server; no unsigned preset or client-side secret is
needed. Deletions invalidate the CDN copy and images referenced by content
cannot be deleted. See the [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference).

With the local development servers running, use
`node --env-file=.env scripts/verify-images.cjs` to check form uploads, previews,
image relationships, and removing selections. This creates temporary content,
media, and an administrator, then removes them.
