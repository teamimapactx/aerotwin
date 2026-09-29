FROM python:3.11-slim

# Install Node.js for building the React frontend
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Step 1: Copy and build the frontend
COPY frontend/package*.json ./frontend/
WORKDIR /app/frontend
RUN npm install
COPY frontend/ ./
RUN npm run build

# Step 2: Copy and setup the backend
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./

# Expose the port the app runs on
EXPOSE 8000

# Start the unified backend (which now also serves the frontend)
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8000"]
