#!/usr/bin/env bash

port=${NODEPORT:-8080}

(cd /tmp; PORT=$port node /src/aws/index.js)
