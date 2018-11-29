"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const HealthRoute = () => express_1.Router().get('/_health/?', (req, res) => res.sendStatus(200));
exports.default = HealthRoute;
//# sourceMappingURL=HealthRoute.js.map