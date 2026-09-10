# Multi-stage Dockerfile scoped to the API directory

FROM node:20-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Install dependencies
COPY package*.json nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
RUN npm ci --loglevel=verbose && npx prisma generate
# Build sources
COPY src ./src
RUN npm run build \
  && test -f dist/main.js \
  && echo "build ok: $(ls -la dist)"

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev --loglevel=verbose \
  && npx prisma generate \
  && test -f dist/main.js
ENV PORT=8080
CMD ["node", "dist/main.js"]
