FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set dummy environment variables for build
# These are only used during build and will be overridden at runtime
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/kb?schema=public"
ENV NEXTAUTH_SECRET="build-time-secret-change-in-production"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NEXT_TELEMETRY_DISABLED=1
ENV TURBOPACK=0

# Generate Prisma Client
RUN npx prisma generate

RUN npm run build


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_PATH="/app/.next/standalone/node_modules:/app/node_modules:/ROOT/node_modules"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Ensure pdfkit (including bundled fonts) is available in the standalone output and at the runtime root
RUN set -eux; \
    mkdir -p /app/.next/standalone/node_modules/pdfkit /ROOT/node_modules; \
    cp -r /app/node_modules/pdfkit /app/.next/standalone/node_modules/pdfkit; \
    cp -r /app/node_modules/pdfkit /ROOT/node_modules/pdfkit

# Copy all node_modules (simpler and more reliable than cherry-picking dependencies)
# COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Install dependencies for Prisma
RUN apk add --no-cache openssl

# Install prisma CLI for migrations (it's a dev dependency so not in standalone)
RUN npm install -g prisma@6.0.0

# Allow nextjs user to write to prisma cache/engines
RUN chown -R nextjs:nodejs /usr/local/lib/node_modules/prisma

# Copy Prisma schema and migrations for runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
