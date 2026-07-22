#!/usr/bin/env bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r backend/requirements.txt

echo "=== Building frontend ==="
cd frontend
npm ci
npm run build

echo "=== Collecting static files ==="
cd ../backend
python manage.py collectstatic --noinput

echo "=== Running migrations ==="
python manage.py migrate --noinput

echo "=== Creating admin user if needed ==="
python manage.py initadmin

echo "=== Build complete ==="
