#!/bin/sh
set -e

echo "Checking Prisma version..."
prisma --version

echo "Running database migrations..."
prisma migrate deploy

echo "Starting application..."
exec node server.js
