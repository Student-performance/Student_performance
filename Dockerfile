FROM node:20-bookworm-slim

# Install Python 3, pip, and venv
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    sqlite3 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Setup Python virtual environment and install ML requirements
COPY requirements.txt ./
RUN python3 -m venv /app/.venv && \
    /app/.venv/bin/pip install --no-cache-dir -r requirements.txt

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV PYTHON_PATH=/app/.venv/bin/python
ENV DATABASE_PATH=/app/data/app.db
ENV SESSION_SECRET=production-secret-must-be-at-least-32-characters-long

# Ensure data directory exists
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["npm", "start"]