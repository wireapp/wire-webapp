FROM node:26.13.0-alpine3.24@sha256:8996bb5821d62a8fd9bb27c1cb07462f3fdce6e47d640c6a881ead0b064ce216

# For some extra dependencies...
RUN apk add --no-cache dumb-init git bash

WORKDIR /app

# Copy built server artifacts and runtime files
COPY apps/server/dist /dist
COPY run.sh .env.defaults ./
COPY .env.defaults /dist/.env.defaults

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/app/run.sh"]
