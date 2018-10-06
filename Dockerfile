# Note that to build this you will need docker > 17.05
FROM node:10-alpine as builder

# For some extra dependencies...
RUN apk add --no-cache dumb-init git python gcc make linux-headers libc6-compat bash

# This is required to build some of the webapp modules
RUN echo '{ "allow_root": true }' > /root/.bowerrc

COPY . /tmp/src
ENV NODE_PATH=/src/node_modules
ENV PATH=$PATH:/src/node_modules/.bin
WORKDIR /tmp/src
RUN yarn && yarn deploy-travis-prod

####################################################
# Smaller image for runtime

FROM python:2.7.15-alpine3.8

RUN apk add --no-cache dumb-init bash

COPY --from=builder /tmp/src/aws /src/aws
COPY --from=builder /tmp/src/run.sh /src/run.sh

# How can this be changed?
EXPOSE 5000

# Start the app
WORKDIR /src/aws

# For runtime, it needs a few extra packages
RUN pip install -r requirements.txt

ENV HOSTHTTPS staging-nginz-https.zinfra.io
ENV HOSTSSL staging-nginz-ssl.zinfra.io
ENV HOSTDOMAIN zinfra.io

ENTRYPOINT ["dumb-init", "--", "/bin/bash", "/src/run.sh"]
