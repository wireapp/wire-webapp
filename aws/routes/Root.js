"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const geolite2 = require('geolite2');
const maxmind = require('maxmind');
function addGeoIP(req) {
    let countryCode = '';
    try {
        const ip = req.header('X-Forwarded-For') || req.ip;
        const lookup = maxmind.openSync(geolite2.paths.country);
        const result = lookup.get(ip);
        if (result) {
            countryCode = result.country.iso_code;
        }
    }
    catch (error) {
    }
    req.app.locals.country = countryCode;
}
const Root = (config) => [
    express_1.Router().get('/', (req, res) => res.render('index')),
    express_1.Router().get('/auth', (req, res) => {
        addGeoIP(req);
        return res.render('auth/index');
    }),
    express_1.Router().get('/login', (req, res) => {
        addGeoIP(req);
        return res.render('login/index');
    }),
    express_1.Router().get('/demo', (req, res) => res.render('demo/index')),
];
exports.default = Root;
//# sourceMappingURL=Root.js.map