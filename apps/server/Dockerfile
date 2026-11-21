# ==============================================================================
# CollabArch Backend Server — Multi-Stage Production Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

# Required by Prisma query engine on Alpine Linux (musl libc)
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Enable Corepack and install pinned pnpm package manager
RUN corepack enable && corepack prepare pnpm@10.29.1 --activate

# Copy monorepo workspace configurations and package definitions
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY packages/shared-types/package.json packages/shared-types/tsconfig.json ./packages/shared-types/
COPY apps/server/package.json apps/server/tsconfig.json apps/server/nest-cli.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies deterministically
RUN pnpm install --frozen-lockfile

# Copy Prisma schema and migrations
COPY apps/server/prisma ./apps/server/prisma

# Copy source files
COPY packages/shared-types ./packages/shared-types
COPY apps/server/src ./apps/server/src

# Generate Prisma client for linux-musl
RUN pnpm --filter @collabarch/server prisma generate

# Build shared-types library and NestJS server
RUN pnpm --filter @collabarch/shared-types build
RUN pnpm --filter @collabarch/server build

# ------------------------------------------------------------------------------
# Stage 2: Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

# Required by Prisma query engine at runtime
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app/apps/server

ENV NODE_ENV=production
ENV PORT=4000

# Create dedicated non-root user & group for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copy root and package dependencies along with built artifacts
COPY --from=builder --chown=nestjs:nodejs /app/node_modules /app/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages /app/packages
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/node_modules /app/apps/server/node_modules
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/dist /app/apps/server/dist
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/prisma /app/apps/server/prisma
COPY --from=builder --chown=nestjs:nodejs /app/apps/server/package.json /app/apps/server/package.json

# Expose binaries in PATH so `prisma` is directly executable
ENV PATH="/app/apps/server/node_modules/.bin:/app/node_modules/.bin:$PATH"

USER nestjs

EXPOSE 4000

# Run pending database migrations before starting the NestJS application
CMD ["sh", "-c", "prisma migrate deploy && node dist/main.js"]

