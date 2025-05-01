#!/usr/bin/env bash
set -euo pipefail

PR_NUMBER=19041
REPO="wireapp/wire-webapp"

response=$(curl -s -H "Authorization: token $GITHUB_TOKEN" \
                 -H "Accept: application/vnd.github.v3+json" \
                 "https://api.github.com/repos/$REPO/pulls/$PR_NUMBER")

echo "Raw PR data:"
echo "$response"

total_additions=$(echo "$response" | jq -r '.additions')
echo "Found total additions: $total_additions"
