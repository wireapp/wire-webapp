#!/bin/bash
# Install npm dependencies before deployment

set -e

echo "Running npm install..."
cd /var/app/staging
npm install --production

echo "npm install completed successfully"
