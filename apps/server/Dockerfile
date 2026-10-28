FROM node:24.22.1-alpine3.24@sha256:06d7adf3e0ef61a13f1d28682726366f97a15aa1888c934d3ecec86c33918b53

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
