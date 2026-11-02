FROM node:26.13.0-alpine3.24@sha256:c6ad9e9c1d80f6eb607c26b4b0a132ff7a2344fad1c78ea3baa2a7d4c8de6d94

# For some extra dependencies...
RUN apk add --no-cache dumb-init git bash

WORKDIR /app

# npm workspace metadata
COPY package.json package-lock.json .npmrc ./
COPY apps/server/package.json ./apps/server/package.json
COPY libraries/config/package.json ./libraries/config/package.json

# Install only server production deps
RUN npm clean-install --omit=dev --workspace=@wireapp/server --include-workspace-root=false --ignore-scripts

# Copy built config library artifacts
COPY libraries/config/lib ./libraries/config/lib

# Copy built server artifacts and runtime files
COPY apps/server/dist /dist
COPY run.sh .env.defaults ./
COPY .env.defaults /dist/.env.defaults

ENV NODE_PATH=/app/node_modules
ENV PATH=/app/node_modules/.bin:$PATH

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/app/run.sh"]
