#!/bin/sh
set -e

echo "Checking Prisma version..."
npx prisma --version

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting application..."
exec node server.js
