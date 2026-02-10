# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
# Dummy API key for build (runtime key comes from .env.local)
ARG OPENAI_API_KEY=sk-dummy-key-for-build
ENV OPENAI_API_KEY=${OPENAI_API_KEY}

RUN npm run build

# Ensure directories exist for copy
RUN mkdir -p /app/public /app/.next/static

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    apk add --no-cache su-exec

# Copy standalone output (required)
COPY --from=builder /app/.next/standalone ./

# Copy public folder (may be empty)
COPY --from=builder /app/public ./public

# Copy static files (may be empty)
COPY --from=builder /app/.next/static/. ./.next/static/

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory
RUN mkdir -p /app/data

EXPOSE 8070

ENV PORT=8070
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "server.js"]
