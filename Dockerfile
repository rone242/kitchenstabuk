# syntax=docker/dockerfile:1.7
# Build from the repository root. Select a deployable app with --target:
# api, web, or admin.
FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages ./packages
RUN pnpm install --frozen-lockfile

FROM dependencies AS source
COPY . .

FROM source AS api-build
# Prisma loads its datasource configuration during client generation. This URL
# is syntactically valid but is used only while building the image; the real
# production DATABASE_URL is supplied by Docker Compose when the API runs.
ENV DIRECT_URL=postgresql://build:build@localhost:5432/build
RUN pnpm --filter database db:generate \
 && pnpm --filter database build \
 && pnpm --filter api build \
 && pnpm --filter api --prod deploy /opt/api

FROM base AS api
ENV NODE_ENV=production \
    API_PORT=4000
RUN addgroup --system --gid 1001 app \
 && adduser --system --uid 1001 --ingroup app app
WORKDIR /app
COPY --from=api-build --chown=app:app /opt/api ./
USER app
EXPOSE 4000
CMD ["node", "dist/main.js"]

FROM source AS web-build
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
RUN pnpm --filter web build

FROM base AS web
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 app \
 && adduser --system --uid 1001 --ingroup app app
WORKDIR /app
COPY --from=web-build --chown=app:app /app/apps/web/.next/standalone ./
COPY --from=web-build --chown=app:app /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM source AS admin-build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter admin build

FROM base AS admin
ENV NODE_ENV=production \
    PORT=3001 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 app \
 && adduser --system --uid 1001 --ingroup app app
WORKDIR /app
COPY --from=admin-build --chown=app:app /app/apps/admin/.next/standalone ./
COPY --from=admin-build --chown=app:app /app/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=admin-build --chown=app:app /app/apps/admin/public ./apps/admin/public
USER app
EXPOSE 3001
CMD ["node", "apps/admin/server.js"]
