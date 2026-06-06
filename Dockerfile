FROM node:20-alpine

WORKDIR /app

# Install system dependencies (curl for healthchecks, ffmpeg for media streaming helpers if needed)
RUN apk add --no-cache curl ffmpeg

# Copy package descriptors first to take advantage of Docker cache layer
COPY package*.json ./

# Install packages
RUN npm install

# Copy application source code
COPY . .

# Expose backend port
EXPOSE 5000

# Start server using the development command (with nodemon)
CMD ["npm", "run", "dev"]
