FROM node:24.22.2-alpine3.24@sha256:8a32c8cf649a49915a66e81e7a609223c708d0adabf288ee3f4077d765542f85

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
