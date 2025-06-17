#!/bin/sh
# husky helper script

# Check if we're running in CI
if [ "$CI" = "true" ]; then
  exit 0
fi

# Check if husky is installed
if [ ! -f ".husky/_/husky.sh" ]; then
  echo "⚠️  Husky not installed. Skipping hook."
  exit 0
fi