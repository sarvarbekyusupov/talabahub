# ==========================================
# Multi-stage Dockerfile for TalabaHub Backend
# ==========================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci && npm cache clean --force

# Generate Prisma Client
ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy?schema=public"
RUN npx prisma generate

# ==========================================
# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy application source
COPY . .

# Build application
RUN npm run build

# ==========================================
# Stage 3: Production
FROM node:20-alpine AS production

# Install dumb-init and wget for healthcheck
RUN apk add --no-cache dumb-init wget

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY --chown=nestjs:nodejs package*.json ./

# Copy Prisma files
COPY --chown=nestjs:nodejs --from=builder /app/prisma ./prisma

# Copy node_modules with Prisma client
COPY --chown=nestjs:nodejs --from=deps /app/node_modules ./node_modules

# Copy built application
COPY --chown=nestjs:nodejs --from=builder /app/dist ./dist

# Copy email templates
COPY --chown=nestjs:nodejs src/mail/templates ./src/mail/templates

# Create logs directory
RUN mkdir -p logs && chown -R nestjs:nodejs logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application (migrations will run before starting)
# Resolve any failed migrations first, then deploy
CMD ["sh", "-c", "npx prisma migrate resolve --applied add_audit_log || true && npx prisma migrate deploy && node dist/src/main"]
