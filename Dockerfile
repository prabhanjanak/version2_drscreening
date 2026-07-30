# ==============================================================================
# Stage 1: Build stage
# ==============================================================================
FROM node:22-slim AS builder

WORKDIR /app

# Enable Corepack for pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy monorepo configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./

# Copy packages and workspace folders
COPY lib ./lib
COPY scripts ./scripts
COPY artifacts ./artifacts

# Install dependencies and build monorepo packages
RUN pnpm install
RUN pnpm run build

# ==============================================================================
# Stage 2: Production API Server
# ==============================================================================
FROM node:22-slim AS api

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace package manifests for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json tsconfig.json ./
COPY lib ./lib
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json

RUN pnpm install --prod

# Copy compiled backend output from builder
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

WORKDIR /app/artifacts/api-server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]

# ==============================================================================
# Stage 3: Nginx Frontend Web Server
# ==============================================================================
FROM nginx:alpine AS web

# Copy Nginx server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built frontend assets from builder stage
COPY --from=builder /app/artifacts/retina/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
