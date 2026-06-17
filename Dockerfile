# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/ui
COPY ui/package*.json ./
RUN npm install
COPY ui/ ./
RUN npm run build

# Stage 2: Run Backend
FROM node:22-alpine
WORKDIR /app



# Copy backend package files
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --production

# Copy backend source code
COPY backend/ ./src

# Copy built frontend static files from Stage 1
COPY --from=frontend-builder /app/ui/dist /app/ui/dist

# Set environment variables
ENV PORT=5000
ENV NODE_ENV=production

# Expose port
EXPOSE 5000

# Start server
CMD ["node", "src/server.js"]
