var wire = require('wire-webapp-core');

var conversationId = process.env.PORT;
var email = process.env.WIRE_WEBAPP_BOT_EMAIL;
var message = 'Hello René';
var password = process.env.WIRE_WEBAPP_BOT_PASSWORD;

var user = new wire.User(email, password).login(false)
  .then(function(service) {
    return service.conversation.sendTextMessage(conversationId, message);
  })
  .then(function(service) {
    return service.user.logout();
  })
  .then(function(service) {
    return process.exit(0);
  })
  .catch(function(error) {
    console.log('Error: ' + error.message);
    return process.exit(1);
  });
