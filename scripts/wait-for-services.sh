#!/bin/bash

# Wait for services to be ready
echo "Waiting for services to start..."

# Wait for backend
echo "Checking backend..."
for i in {1..30}; do
  if curl -f http://localhost:8000/health 2>/dev/null; then
    echo "✅ Backend is ready"
    break
  fi
  echo "Waiting for backend... ($i/30)"
  sleep 2
done

# Wait for frontend
echo "Checking frontend..."
for i in {1..30}; do
  if curl -f http://localhost:3000 2>/dev/null; then
    echo "✅ Frontend is ready"
    break
  fi
  echo "Waiting for frontend... ($i/30)"
  sleep 2
done

# Wait for database
echo "Checking database..."
for i in {1..30}; do
  if docker-compose exec -T db pg_isready -U postgres 2>/dev/null; then
    echo "✅ Database is ready"
    break
  fi
  echo "Waiting for database... ($i/30)"
  sleep 2
done

# Final check
if curl -f http://localhost:8000/health && curl -f http://localhost:3000; then
  echo "✅ All services are ready!"
  exit 0
else
  echo "❌ Services failed to start"
  docker-compose logs
  exit 1
fi