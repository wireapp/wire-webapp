FROM node:23-alpine

# For some extra dependencies...
RUN apk add --no-cache dumb-init git bash && corepack enable

WORKDIR /app

# Yarn berry workspace metadata
COPY package.json yarn.lock .yarnrc.yml .npmrc* ./
COPY .yarn ./.yarn
COPY apps/server/package.json ./apps/server/package.json

# Install only server production deps
RUN yarn workspaces focus @wireapp/server --production

# Copy built server artifacts and runtime files
COPY apps/server/dist /dist
COPY run.sh .env.defaults ./

ENV NODE_PATH=/app/node_modules
ENV PATH=/app/node_modules/.bin:$PATH

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/run.sh"]
