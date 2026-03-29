# Stage 1: Build the frontend
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source files and build the frontend
COPY . .
RUN npm run build

# Stage 2: Run the server
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production

# Copy server files
COPY server/ ./server/
COPY src/core/ ./src/core/
COPY src/utils/ ./src/utils/

# Copy the built frontend from the previous stage
COPY --from=build /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server/index.js"]
