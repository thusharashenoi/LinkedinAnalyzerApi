# Use Node.js as base image
FROM node:18-slim

# Install Python and pip for your Python scripts
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./
COPY requirements.txt ./

# Install Node.js dependencies
RUN npm ci --only=production

# Install Python dependencies
RUN pip3 install -r requirements.txt --break-system-packages

# Copy application code
COPY . .

# Create screenshots directory if it doesn't exist
RUN mkdir -p screenshots

# Expose the port (Render assigns PORT automatically)
EXPOSE 3000

# Start the server (Render will set PORT env variable)
CMD ["node", "server.js"]