#!/bin/bash

# Migration script for different environments
# This script handles database migrations appropriately based on the environment

set -e

echo "Running database migrations..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "Error: DATABASE_URL environment variable is not set"
    exit 1
fi

# In production or CI environments, use migrate deploy
if [ "$NODE_ENV" = "production" ] || [ "$CI" = "true" ]; then
    echo "Running production migration (deploy)..."
    npx prisma migrate deploy
else
    # In development, check if we're in an interactive terminal
    if [ -t 0 ]; then
        echo "Running development migration (interactive)..."
        npx prisma migrate dev
    else
        echo "Non-interactive environment detected. Using migrate deploy..."
        npx prisma migrate deploy
    fi
fi

echo "Migrations completed successfully!"