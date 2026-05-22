# ─── Build stage ────────────────────────────────────────────────
FROM node:20-slim AS builder
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build frontend (Vite) + backend (TypeScript)
RUN pnpm build && pnpm build:api

# ─── Production stage ───────────────────────────────────────────
FROM node:20-slim AS production
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# Install production dependencies only
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy built artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/dist-api ./dist-api
COPY api/migrations ./api/migrations

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist-api/server.js"]
