#!/usr/bin/env bash
# GenoSync API deploy: build Docker image, push to ECR, update ECS service.
#
# Required env:
#   AWS_REGION              e.g. us-east-1
#   AWS_ACCOUNT_ID          12-digit AWS account id
#   GENOSYNC_ECR_REPO      ECR repository name (e.g. genosync-api)
#   GENOSYNC_ECS_CLUSTER   ECS cluster name (e.g. genosync)
#   GENOSYNC_ECS_SERVICE   ECS service name (e.g. genosync-api)
#
# Optional:
#   IMAGE_TAG               defaults to git short SHA

set -euo pipefail

: "${AWS_REGION:?AWS_REGION not set}"
: "${AWS_ACCOUNT_ID:?AWS_ACCOUNT_ID not set}"
: "${GENOSYNC_ECR_REPO:?GENOSYNC_ECR_REPO not set}"
: "${GENOSYNC_ECS_CLUSTER:?GENOSYNC_ECS_CLUSTER not set}"
: "${GENOSYNC_ECS_SERVICE:?GENOSYNC_ECS_SERVICE not set}"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
TAG="${IMAGE_TAG:-$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE="${REGISTRY}/${GENOSYNC_ECR_REPO}:${TAG}"
LATEST="${REGISTRY}/${GENOSYNC_ECR_REPO}:latest"

echo "==> Logging in to ECR (${REGISTRY})"
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

echo "==> Building image ${IMAGE}"
docker build \
  -f "$ROOT/artifacts/api/Dockerfile" \
  -t "$IMAGE" \
  -t "$LATEST" \
  "$ROOT"

echo "==> Pushing to ECR"
docker push "$IMAGE"
docker push "$LATEST"

echo "==> Forcing ECS service redeploy (${GENOSYNC_ECS_SERVICE})"
aws ecs update-service \
  --cluster "$GENOSYNC_ECS_CLUSTER" \
  --service "$GENOSYNC_ECS_SERVICE" \
  --force-new-deployment \
  --region "$AWS_REGION" \
  --output text > /dev/null

echo "==> Waiting for deployment to stabilize..."
aws ecs wait services-stable \
  --cluster "$GENOSYNC_ECS_CLUSTER" \
  --services "$GENOSYNC_ECS_SERVICE" \
  --region "$AWS_REGION"

echo "==> Deployed ${IMAGE}"
