FROM node:20-slim AS builder
# Use glibc-based image to match Prisma engines in schema.prisma binaryTargets.
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Install dependencies (devDependencies required for the Nest build step)
COPY api/package*.json api/tsconfig*.json api/nest-cli.json ./api/
COPY api/prisma ./api/prisma
RUN cd api && npm ci --include=dev --loglevel=verbose
# Generate Prisma client using targets declared in prisma/schema.prisma.
RUN cd api && npx prisma generate
# Build sources
COPY api/src ./api/src
RUN cd api && npm run build \
  && test -f dist/main.js \
  && echo "build ok: $(ls -la dist)"

FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/api/dist ./dist
COPY --from=builder /app/api/package*.json ./
COPY --from=builder /app/api/prisma ./prisma
RUN npm ci --omit=dev --loglevel=verbose \
  && npx prisma generate \
  && test -f dist/main.js
ENV PORT=8080
CMD ["node", "dist/main.js"]
