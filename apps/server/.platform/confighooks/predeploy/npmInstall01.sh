#!/bin/bash
# Install npm dependencies before configuration-only deployments

set -e

echo "Running npm install..."
cd /var/app/staging
npm install --production

echo "npm install completed successfully"
