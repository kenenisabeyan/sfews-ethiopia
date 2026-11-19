# ==========================================
# SFEWS Command Center - Production Frontend
# Multi-Stage Optimized Docker Build
# ==========================================

# --- Stage 1: Build Workspace ---
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm package manager
RUN corepack enable && corepack prepare pnpm@latest --activate

# Cache dependencies layer
COPY package.json pnpm-lock.yaml* package-lock.json* ./

# Install dependencies with fail-safe fallback
RUN pnpm install --frozen-lockfile || pnpm install || npm install

# Copy application sources
COPY . .

# Production Build
ARG VITE_API_URL=""
ENV VITE_API_URL=${VITE_API_URL}
RUN pnpm run build || npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:1.27-alpine

# Install curl for container health check
RUN apk add --no-cache curl

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized production Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose standard HTTP port
EXPOSE 80

# Container liveness health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
