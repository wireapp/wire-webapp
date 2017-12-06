const context = require.context('./app/script/auth', true, /.test\.jsx?$/);
context.keys().forEach(context);
