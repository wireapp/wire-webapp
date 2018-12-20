"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ConfigRoute = (config) => express_1.Router().get('/config.js', (req, res) => {
    const clientConfig = Object.assign({}, config.CLIENT, { APP_BASE: config.SERVER.APP_BASE });
    res.type('application/javascript').send(`
      window.wire = window.wire || {};
      window.wire.env = ${JSON.stringify(clientConfig)};
    `);
});
exports.default = ConfigRoute;
//# sourceMappingURL=ConfigRoute.js.map