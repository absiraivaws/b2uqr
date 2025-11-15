# syntax=docker/dockerfile:1
# Multi-stage Dockerfile for Next.js (App Router) on Cloud Run
# Using Debian slim for better native module compatibility (@node-rs/argon2)

ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-bookworm-slim AS deps

# Build in production mode for consistent Next.js behavior
ENV NODE_ENV=production
WORKDIR /app

# Install build tools (only in build stage) for any native fallback compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential python3 ca-certificates git openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy manifests first for better layer caching
COPY package*.json ./

# Install dependencies (dev deps included for build)
RUN npm ci --no-audit --no-fund

# Copy source and config files
COPY tsconfig.json ./tsconfig.json
COPY . .

# --- Build-time env (public) --------------------------------------------------
# Next.js inlines NEXT_PUBLIC_* values at build time. Provide them via
# --build-arg when building the image locally or in CI/CD.
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}
ENV NEXT_PUBLIC_FIREBASE_APP_ID=${NEXT_PUBLIC_FIREBASE_APP_ID}
ENV NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=${NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}

# Build Next.js (ignores TS & ESLint errors per next.config.ts settings)
RUN npm run build

# Production image
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Cloud Run injects PORT; default to 8080
ENV PORT=8080
WORKDIR /app

# Copy only the minimal standalone output and static/public assets
# This avoids copying caches and dev files and eliminates the need to install deps again
COPY --from=deps /app/.next/standalone ./
COPY --from=deps /app/.next/static ./.next/static
COPY --from=deps /app/public ./public

# Create a non-root user for security best practices
RUN useradd -m -u 1001 nodeusr && chown -R nodeusr:nodeusr /app
USER nodeusr

EXPOSE 8080

# Run the prebuilt standalone server (no next start needed)
CMD ["sh", "-c", "node server.js -p $PORT"]
