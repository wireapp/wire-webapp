#!/usr/bin/env bash
#
# Using PORT is problematic for some environments (e.g., k8s does not like it if you
# override that environment variable) which is why we handle it specifically here
#

port=${NODE_PORT:-8080}

PORT=$port node /src/server/dist/index.js
