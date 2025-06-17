#!/bin/bash

# Build script for backend
# This script handles the build process including TypeScript compilation and Prisma generation

set -e

echo "Starting backend build process..."

# Clean previous build
echo "Cleaning previous build..."
rm -rf dist

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Compile TypeScript
echo "Compiling TypeScript..."
npm run build

# Copy non-TypeScript files if needed (e.g., templates, etc.)
# echo "Copying additional files..."
# cp -r src/templates dist/templates 2>/dev/null || true

echo "Build completed successfully!"

# Note: Database migrations should be run separately during deployment
# They should not be part of the build process
echo ""
echo "Note: Remember to run migrations during deployment using:"
echo "  npm run migrate (for production)"
echo "  npm run migrate:dev (for development)"