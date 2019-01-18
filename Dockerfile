FROM node:10-alpine

# For some extra dependencies...
RUN apk add --no-cache dumb-init git bash python

# This is required to build some of the webapp modules
RUN echo '{ "allow_root": true }' > /root/.bowerrc

COPY . /src
ENV NODE_PATH=/src/node_modules
ENV PATH=$PATH:/src/node_modules/.bin

ARG WIRE_CONFIGURATION_REPOSITORY
ARG WIRE_CONFIGURATION_REPOSITORY_VERSION
ARG WIRE_CONFIGURATION_EXTERNAL_DIR

RUN echo "Value of WIRE_CONFIGURATION_EXTERNAL_DIR is ${WIRE_CONFIGURATION_EXTERNAL_DIR}"

WORKDIR /src
RUN ls -la /src/config
RUN yarn && yarn build:prod

RUN ls -la /src/config

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/src/run.sh"]
