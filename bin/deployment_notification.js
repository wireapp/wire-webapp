var wire = require('wire-webapp-core');

var conversationId = '9fe8b359-b9e0-4624-b63c-71747664e4fa';
var email = process.env.WIRE_WEBAPP_BOT_EMAIL;
var message = process.argv[2];
var password = process.env.WIRE_WEBAPP_BOT_PASSWORD;

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
