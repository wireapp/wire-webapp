#!/bin/bash

# Authentication
BOT_EMAIL=$WIRE_WEBAPP_BOT_EMAIL
BOT_PASSWORD=$WIRE_WEBAPP_BOT_PASSWORD
ACCESS_TOKEN=$(curl "https://prod-nginz-https.wire.com/login?persist=false" -H "User-Agent: Wire's Webapp Bot" -H "Content-Type: application/json; charset=UTF-8" --data-binary '{"email":"'$BOT_EMAIL'","password":"'"$BOT_PASSWORD"'"}' --compressed | python -c 'import sys, json; print json.load(sys.stdin)["access_token"]')
AUTHOR_OF_LAST_COMMIT=$(git log | grep Author: | cut -d' ' -f2- | uniq | head -n1)
SUMMARY_OF_LAST_COMMIT=$(git log -1 --pretty=%s)
WEBAPP_URL="https://app.wire.com/"

if [ "$TRAVIS_BRANCH" = "staging" ]; then
  WEBAPP_URL="https://wire-webapp-staging.zinfra.io/auth/?env=prod#login"
elif [ "$TRAVIS_BRANCH" = "edge" ]; then
  WEBAPP_URL="https://wire-webapp-edge.zinfra.io/auth/?env=prod#login"
elif [ "$TRAVIS_BRANCH" = "prod" ]; then
  WEBAPP_URL="https://wire-webapp-prod-next.wire.com/auth/#login"
fi;

# Message
MESSAGE_CONTENT="**New Wire for Web version #$TRAVIS_BUILD_NUMBER online for $TRAVIS_BRANCH.** ᕦ(￣ ³￣)ᕤ\n- $WEBAPP_URL\n- Last commit from: $AUTHOR_OF_LAST_COMMIT\n- Last commit summary: $SUMMARY_OF_LAST_COMMIT"

# Conversations
CONVERSATION_IDS[0]="9fe8b359-b9e0-4624-b63c-71747664e4fa" # ω Webapp Releases

# Post message to conversations
for CONVERSATION_ID in "${CONVERSATION_IDS[@]}"
do
  java -jar ./bin/wire-notify-0.1.0-jar-with-dependencies.jar -e ${BOT_EMAIL} -p ${BOT_PASSWORD} -c ${CONVERSATION_ID} -m ${MESSAGE_CONTENT}
done
