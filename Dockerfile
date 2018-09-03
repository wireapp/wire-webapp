FROM node:8.11.4-alpine

# For some extra dependencies...
RUN apk add --no-cache git python gcc make linux-headers libc6-compat bash

# This is required to build some of the webapp modules
RUN echo '{ "allow_root": true }' > /root/.bowerrc

COPY . /src
ENV NODE_PATH=/src/node_modules
ENV PATH=$PATH:/src/node_modules/.bin
WORKDIR /src
RUN yarn

EXPOSE 8080

ENTRYPOINT ["/bin/bash", "/src/run.sh"]
CMD ["start"]
