#!/usr/bin/env bash
# Verify the runtime defaults baked into a WebApp server image, the same check
# tools/dockerPublication/pushDocker.js runs before it publishes an image.
set -euo pipefail

image_reference="${1:-}"
if [[ -z "${image_reference}" ]]; then
  echo 'Usage: verifyRuntimeDefaults.sh <image reference>' >&2
  exit 1
fi

required_environment_default_keys=(
  BACKEND_NAME
  BRAND_NAME
  URL_ACCOUNT_BASE
  BACKEND_REST
  BACKEND_WS
)

smoke_check_command='test -s /dist/.env.defaults'
for required_key in "${required_environment_default_keys[@]}"; do
  smoke_check_command+=" && grep -q \"^${required_key}=\" /dist/.env.defaults"
done

echo "Verifying the runtime defaults of ${image_reference}"
docker pull --quiet "${image_reference}"
docker run --rm --entrypoint sh "${image_reference}" -c "${smoke_check_command}"
echo "Runtime defaults verified: ${required_environment_default_keys[*]}"
