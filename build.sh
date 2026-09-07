#!/usr/bin/env bash
set -e

echo '==> Installing backend dependencies...'
npm install --prefix backend

echo '==> Installing frontend dependencies (including devDependencies for Vite)...'
npm install --include=dev --prefix ui

echo '==> Building frontend with Vite...'
npm run build --prefix ui

echo '==> Build complete! ui/dist ready.'

