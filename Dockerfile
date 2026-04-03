# Dockerfile for Crowdfunding DApp Frontend
# Docker allows you to package the app in a container that runs anywhere
# This is a multi-stage build: first build, then run

# Stage 1: Build the application
# Use Node.js 18 as the base image
FROM node:18-alpine AS builder

# Set working directory (where commands will run)
WORKDIR /app

# Copy package files first (for better caching)
# This helps Docker cache dependencies separately from code
COPY frontend/package*.json ./

# Install dependencies
# npm ci is faster and more reliable than npm install for production
RUN npm ci

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the Next.js application
# This creates optimized production files
RUN npm run build

# Stage 2: Production image
# Use a smaller Node.js image for running (not building)
FROM node:18-alpine AS runner

# Set working directory
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Don't run as root user (security best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only necessary files from builder stage
# Copy built application and node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Change ownership to nextjs user
RUN chown -R nextjs:nodejs /app

# Switch to nextjs user
USER nextjs

# Expose port 3000 (Next.js default port)
EXPOSE 3000

# Set environment variable for port
ENV PORT=3000

# Command to start the application
CMD ["node", "server.js"]

