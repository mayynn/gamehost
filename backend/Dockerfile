FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm install
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# ── Production runner ────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# dumb-init for proper PID 1 signal handling + non-root user
RUN apk add --no-cache openssl dumb-init \
    && addgroup -g 1001 -S appgroup \
    && adduser -S appuser -u 1001 -G appgroup

ENV NODE_ENV=production

COPY --from=builder --chown=appuser:appgroup /app/dist ./dist
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:appgroup /app/prisma ./prisma
COPY --from=builder --chown=appuser:appgroup /app/package.json ./

USER appuser
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/api/health || exit 1

# dumb-init forwards SIGTERM properly for graceful shutdown
# migrate deploy applies committed migrations; db push is the fallback for first-run edge cases
CMD ["dumb-init", "sh", "-c", "(npx prisma migrate deploy || npx prisma db push --skip-generate) && node dist/main.js"]
