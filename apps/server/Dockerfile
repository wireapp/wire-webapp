FROM node:26.12.1-alpine3.24@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797

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
