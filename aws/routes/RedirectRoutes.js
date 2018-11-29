"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const BrowserUtil = require("../util/BrowserUtil");
const STATUS_CODE_FOUND = 302;
const router = express.Router();
const RedirectRoutes = (config) => [
    router.get('/robots.txt', (req, res) => __awaiter(this, void 0, void 0, function* () {
        const robotsContent = config.SERVER.ROBOTS.ALLOWED_HOSTS.includes(req.host)
            ? config.SERVER.ROBOTS.ALLOW
            : config.SERVER.ROBOTS.DISALLOW;
        return res.contentType('text/plain; charset=UTF-8').send(robotsContent);
    })),
    router.get('/join/?', (req, res) => {
        const key = req.query.key;
        const code = req.query.code;
        res.redirect(STATUS_CODE_FOUND, `/auth/?join_key=${key}&join_code=${code}#join-conversation`);
    }),
    router.get('/browser/?', (req, res, next) => {
        if (config.SERVER.DEVELOPMENT) {
            return next();
        }
        const userAgent = req.header('User-Agent');
        const parseResult = BrowserUtil.parseUserAgent(userAgent);
        if (!parseResult) {
            return res.redirect(STATUS_CODE_FOUND, `${config.CLIENT.URL.WEBSITE_BASE}/unsupported/`);
        }
        return res.json(parseResult);
    }),
    router.get('/test/agent/?', (req, res) => {
        const userAgent = req.header('User-Agent');
        const parseResult = BrowserUtil.parseUserAgent(userAgent);
        return res.json(parseResult);
    }),
    router.get('/test/:error/?', (req, res) => {
        try {
            const errorCode = parseInt(req.params.error, 10);
            return res.sendStatus(errorCode);
        }
        catch (error) {
            console.log(error);
            return res.sendStatus(500);
        }
    }),
    router.get('/commit/?', (req, res) => {
        return res.send(config.COMMIT);
    }),
    router.get('/version/?', (req, res) => {
        return res.json({ version: config.CLIENT.VERSION });
    }),
];
exports.default = RedirectRoutes;
//# sourceMappingURL=RedirectRoutes.js.map