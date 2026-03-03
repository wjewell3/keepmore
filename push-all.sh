#!/bin/bash
# Pushes both public and private repos in one command.
# Usage: bash push-all.sh "your commit message"

set -e

MSG=${1:-"update"}

echo "→ Pushing public repo (keepmore)..."
git add .
git commit -m "$MSG" || echo "  (nothing to commit in public repo)"
git push origin main

echo "→ Pushing private repo (keepmore-private)..."
cd private
git add .
git commit -m "$MSG" || echo "  (nothing to commit in private repo)"
git push origin main
cd ..

echo "✓ Both repos pushed."
