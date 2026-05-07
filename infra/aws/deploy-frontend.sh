#!/usr/bin/env bash
# GenoSync frontend deploy: build + S3 sync + CloudFront invalidation.
#
# Required env:
#   AWS_REGION              e.g. us-east-1
#   GENOSYNC_S3_BUCKET     S3 bucket hosting the SPA (e.g. genosync-web-prod)
#   GENOSYNC_CF_DIST_ID    CloudFront distribution id
#
# Optional env:
#   VITE_API_BASE_URL       Public API URL (e.g. https://api.genosync.app)
#   VITE_GENOSYNC_CHAIN    base | base-sepolia | flow  (default: base-sepolia)
#   VITE_AURA_TOKEN_ADDRESS Address of deployed AuraToken on selected chain
#   VITE_PRIVY_APP_ID       Optional Privy app id

set -euo pipefail

: "${AWS_REGION:?AWS_REGION not set}"
: "${GENOSYNC_S3_BUCKET:?GENOSYNC_S3_BUCKET not set}"
: "${GENOSYNC_CF_DIST_ID:?GENOSYNC_CF_DIST_ID not set}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB="$ROOT/artifacts/web"

echo "==> Installing deps"
pnpm install --frozen-lockfile --filter "@genosync/web..."

echo "==> Building frontend (chain=${VITE_GENOSYNC_CHAIN:-base-sepolia})"
( cd "$WEB" && pnpm run build )

DIST="$WEB/dist"
if [ ! -d "$DIST" ]; then
  echo "Build output not found at $DIST" >&2
  exit 1
fi

echo "==> Syncing to s3://${GENOSYNC_S3_BUCKET}"
# Long-cache hashed assets, no-cache for entry HTML so users get the new bundle immediately.
aws s3 sync "$DIST" "s3://${GENOSYNC_S3_BUCKET}" \
  --region "$AWS_REGION" \
  --delete \
  --exclude "index.html" \
  --exclude "*.html" \
  --cache-control "public,max-age=31536000,immutable"

aws s3 sync "$DIST" "s3://${GENOSYNC_S3_BUCKET}" \
  --region "$AWS_REGION" \
  --exclude "*" \
  --include "*.html" \
  --cache-control "no-cache,no-store,must-revalidate"

echo "==> Invalidating CloudFront ${GENOSYNC_CF_DIST_ID}"
aws cloudfront create-invalidation \
  --distribution-id "$GENOSYNC_CF_DIST_ID" \
  --paths "/*" \
  --region "$AWS_REGION" \
  --output text

echo "==> Done"
