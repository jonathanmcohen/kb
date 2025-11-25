#!/bin/sh
set -e

echo "Checking Prisma version..."
node_modules/.bin/prisma --version

echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting application..."
exec node server.js
