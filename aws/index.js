"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const Server_1 = require("./Server");
const TimeUtil_1 = require("./util/TimeUtil");
const server = new Server_1.default(config_1.default);
server
    .start()
    .then(port => {
    console.info(`[${TimeUtil_1.formatDate()}] Server is running on port ${port}.`);
    if (config_1.default.SERVER.DEVELOPMENT) {
        require('opn')(`http://localhost:${config_1.default.SERVER.PORT_HTTP}`);
    }
})
    .catch(error => console.error(`[${TimeUtil_1.formatDate()}] ${error.stack}`));
process.on('uncaughtException', error => console.error(`[${TimeUtil_1.formatDate()}] Uncaught exception: ${error.message}`, error));
process.on('unhandledRejection', error => console.error(`[${TimeUtil_1.formatDate()}] Uncaught rejection "${error.constructor.name}": ${error.message}`, error));
//# sourceMappingURL=index.js.map