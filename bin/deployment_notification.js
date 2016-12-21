'use strict';

const wire = require('wire-webapp-core');

let login = {
  email: process.env.WIRE_WEBAPP_BOT_EMAIL,
  password: process.env.WIRE_WEBAPP_BOT_PASSWORD
};

let commit = {
  author: process.argv[2],
  branch: process.env.TRAVIS_BRANCH,
  message: process.argv[3]
};

let build = {
  number: process.env.TRAVIS_BUILD_NUMBER,
  url: 'https://app.wire.com/'
}

let content = {
  conversationId: '9fe8b359-b9e0-4624-b63c-71747664e4fa',
  message: 'Hello World'
};

switch (commit.branch) {
  case 'dev':
    build.url = 'https://wire-webapp-dev.zinfra.io/auth/?env=prod#login';
    break;
  case 'prod':
    build.url = 'https://wire-webapp-prod-next.wire.com/auth/#login';
    break;
  case 'staging':
    build.url = 'https://wire-webapp-staging.zinfra.io/auth/?env=prod#login';
    break;
}

content.message =
  `**Travis build ${build.number} deployed on '${commit.branch}' environment.** ᕦ(￣ ³￣)ᕤ`
  + `\r\n- Link: ${build.url}`
  + `\r\n- Last commit from: ${commit.author}`
  + `\r\n- Last commit message: ${commit.message}`;

let user = new wire.User(login.email, login.password).login(false)
.then(function(service) {
  return service.conversation.sendTextMessage(content.conversationId, content.message);
})
.then(function(service) {
  return service.user.logout();
})
.then(function() {
  return process.exit(0);
})
.catch(function(error) {
  console.log(error.message);
  return process.exit(1);
});
