FROM node:10-alpine

# For some extra dependencies...
RUN apk add --no-cache dumb-init git bash python

# This is required to build some of the webapp modules
RUN echo '{ "allow_root": true }' > /root/.bowerrc

COPY . /src
ENV NODE_PATH=/src/node_modules
ENV PATH=$PATH:/src/node_modules/.bin
WORKDIR /src
RUN yarn && yarn deploy-travis

EXPOSE 8080

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/src/run.sh"]
