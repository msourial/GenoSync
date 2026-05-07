### GenoSync API — production image for AWS ECS / Fargate ###

# ---- builder ----
FROM node:20-alpine AS builder
WORKDIR /repo

RUN apk add --no-cache libc6-compat \
 && corepack enable

# Copy workspace manifests + lockfile first for cacheable installs.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json ./
COPY artifacts/api/package.json ./artifacts/api/
COPY lib ./lib
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile --filter "@genosync/api..."

# Copy source and build.
COPY artifacts/api ./artifacts/api
RUN pnpm --filter @genosync/api run build

# ---- runtime ----
FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S app && adduser -S app -G app

COPY --from=builder /repo/artifacts/api/dist ./dist
COPY --from=builder /repo/artifacts/api/package.json ./package.json

USER app
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
