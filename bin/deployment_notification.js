const wire = require('wire-webapp-core');

var branch = process.env.TRAVIS_BRANCH;
var commitAuthor = process.argv[2];
var commitMessage = process.argv[3];
var conversationId = '9fe8b359-b9e0-4624-b63c-71747664e4fa';
var email = process.env.WIRE_WEBAPP_BOT_EMAIL;
var password = process.env.WIRE_WEBAPP_BOT_PASSWORD;
var webAppUrl = 'https://app.wire.com/';

switch (branch) {
  case 'dev':
    webAppUrl = 'https://wire-webapp-dev.zinfra.io/auth/?env=prod#login';
    break;
  case 'edge':
    webAppUrl = 'https://wire-webapp-edge.zinfra.io/auth/?env=prod#login';
    break;
  case 'prod':
    webAppUrl = 'https://wire-webapp-prod-next.wire.com/auth/#login';
    break;
  case 'staging':
    webAppUrl = 'https://wire-webapp-staging.zinfra.io/auth/?env=prod#login';
    break;
}

var message =
  `**New Wire for Web version #$TRAVIS_BUILD_NUMBER online for $TRAVIS_BRANCH.** ᕦ(￣ ³￣)ᕤ`
  + `\r\n- ${webAppUrl}`
  + `\r\n- Last commit from: ${commitAuthor}`
  + `\r\n- Last commit summary: ${commitMessage}`;

var user = new wire.User(email, password).login(false)
.then(function(service) {
  return service.conversation.sendTextMessage(conversationId, message);
})
.then(function(service) {
  return service.user.logout();
})
.then(function() {
  return process.exit(0);
})
.catch(function(error) {
  console.log('Error: ' + error.message);
  return process.exit(1);
});
