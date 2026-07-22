#!/usr/bin/env bash
set -e

echo "=== Building frontend ==="
cd frontend
npm ci
npm run build

echo "=== Collecting static files ==="
cd ../backend
python manage.py collectstatic --noinput

echo "=== Running migrations ==="
python manage.py migrate --noinput

echo "=== Build complete ==="
