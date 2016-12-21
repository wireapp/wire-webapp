#!/bin/bash

AUTHOR_OF_LAST_COMMIT=$(git log | grep Author: | cut -d' ' -f2- | uniq | head -n1)
SUMMARY_OF_LAST_COMMIT=$(git log -1 --pretty=%s)
WEBAPP_URL="https://app.wire.com/"

if [ "$TRAVIS_BRANCH" = "dev" ]; then
  WEBAPP_URL="https://wire-webapp-dev.zinfra.io/auth/?env=prod#login"
elif [ "$TRAVIS_BRANCH" = "edge" ]; then
  WEBAPP_URL="https://wire-webapp-edge.zinfra.io/auth/?env=prod#login"
elif [ "$TRAVIS_BRANCH" = "prod" ]; then
  WEBAPP_URL="https://wire-webapp-prod-next.wire.com/auth/#login"
elif [ "$TRAVIS_BRANCH" = "staging" ]; then
  WEBAPP_URL="https://wire-webapp-staging.zinfra.io/auth/?env=prod#login"
fi;

# Message
MESSAGE_CONTENT="**New Wire for Web version #$TRAVIS_BUILD_NUMBER online for $TRAVIS_BRANCH.** ᕦ(￣ ³￣)ᕤ
- $WEBAPP_URL
- Last commit from: $AUTHOR_OF_LAST_COMMIT
- Last commit summary: $SUMMARY_OF_LAST_COMMIT"

# Jenkinsbot endpoint
URL=${JENKINSBOT_URL}
# Secrets for different conversations
SECRETS[0]="${JENKINSBOT_SECRET_FOR_RELEASES}" # ω Webapp Releases

# Post message to conversations
for SECRET in "${SECRETS[@]}"
do
  curl -k -XPOST -H 'Content-Type: text/plain' ${JENKINSBOT_URL}${SECRET} -d "${MESSAGE_CONTENT}" > /dev/null
done
