#!/bin/bash
# Run from the root of your keepmore repo:
#   bash scaffold.sh

set -e

echo "→ Creating monorepo structure..."

# ── Root dirs ──────────────────────────────────────────────────────────────────
mkdir -p packages/core/lib
mkdir -p packages/app/app/onboard
mkdir -p packages/app/app/report/\[id\]
mkdir -p packages/app/app/dashboard/\[merchantId\]
mkdir -p packages/app/app/api/merchants
mkdir -p packages/app/app/api/ingest
mkdir -p packages/app/app/api/dashboard/\[merchantId\]
mkdir -p packages/app/supabase/migrations
mkdir -p packages/app/lib
mkdir -p private/lib
mkdir -p private/app/api/route-payment
mkdir -p private/app/dashboard/\[merchantId\]
mkdir -p private/supabase/migrations

echo "→ Writing root package.json (workspaces)..."
cat > package.json << 'EOF'
{
  "name": "keepmore",
  "private": true,
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "dev": "npm run dev --workspace=packages/app",
    "build": "npm run build --workspace=packages/app",
    "test": "npx ts-node packages/core/lib/savings-calculator.test.ts"
  }
}
EOF

echo "→ Writing packages/core/package.json..."
cat > packages/core/package.json << 'EOF'
{
  "name": "@keepmore/core",
  "version": "0.1.0",
  "description": "Open-source payment fee analysis and savings calculator",
  "main": "lib/savings-calculator.js",
  "types": "lib/savings-calculator.d.ts",
  "license": "MIT",
  "scripts": {
    "build": "tsc",
    "test": "npx ts-node lib/savings-calculator.test.ts"
  },
  "devDependencies": {
    "typescript": "^5",
    "ts-node": "^10"
  }
}
EOF

echo "→ Writing packages/app/package.json..."
cat > packages/app/package.json << 'EOF'
{
  "name": "@keepmore/app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@keepmore/core": "*",
    "next": "14.2.5",
    "react": "^18",
    "react-dom": "^18",
    "stripe": "^16",
    "@supabase/supabase-js": "^2",
    "resend": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "tailwindcss": "^3",
    "autoprefixer": "^10",
    "postcss": "^8",
    "ts-node": "^10"
  }
}
EOF

echo "→ Writing tsconfig.json..."
cat > packages/app/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

echo "→ Writing .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Next.js
packages/app/.next/
packages/app/out/

# Env files
.env
.env.local
.env.*.local

# Private (closed-source) — keep out of public repo
private/

# Vercel
.vercel

# OS
.DS_Store
EOF

echo "→ Writing .env.local template..."
cat > packages/app/.env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Phase 2 only:
HYPERSWITCH_API_KEY=
EOF

echo "→ Writing MIT LICENSE..."
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025 Keepmore

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

echo "→ Writing placeholder files for private packages..."

cat > private/README.md << 'EOF'
# keepmore — private

Closed-source routing layer. Not included in the public repo.

Files:
- lib/router.ts               — Hyperswitch + Stripe fallback orchestrator
- lib/hyperswitch.ts          — Hyperswitch Cloud REST client
- lib/send-report-email.ts    — Resend email (optional to keep private)
- app/api/route-payment/      — Payment routing endpoint
- app/dashboard/              — Cloud dashboard pages + API
- supabase/migrations/002_*   — Routing tables schema
EOF

cat > private/lib/.gitkeep << 'EOF'
EOF

echo "→ Writing push-all.sh..."
cat > push-all.sh << 'EOF'
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
EOF

chmod +x push-all.sh

echo ""
echo "✓ Done. Structure created:"
echo ""
echo "  packages/core/     → @keepmore/core (open source, publish to npm)"
echo "  packages/app/      → Next.js app (open source)"
echo "  private/           → closed-source routing layer (gitignored)"
echo ""
echo "Next steps:"
echo "  1. Create a private GitHub repo called keepmore-private"
echo "  2. cd private && git init && git remote add origin https://github.com/yourusername/keepmore-private.git"
echo "  3. Copy artifact file contents into packages/core/lib/ and packages/app/"
echo "  4. Copy private artifacts into private/"
echo "  5. Run bash push-all.sh to push both repos at once"
echo "  6. cd packages/app && npx next dev"
echo "  7. npx ts-node packages/core/lib/savings-calculator.test.ts"