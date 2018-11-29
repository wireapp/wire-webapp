"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const logdown = require("logdown");
const TimeUtil_1 = require("../../util/TimeUtil");
const router = express.Router();
const logger = logdown('@wireapp/wire-webapp/routes/error/errorRoutes', {
    logger: console,
    markdown: false,
});
const InternalErrorRoute = () => (err, req, res, next) => {
    logger.error(`[${TimeUtil_1.formatDate()}] ${err.stack}`);
    const error = {
        code: 500,
        message: 'Internal server error',
        stack: err.stack,
    };
    const request = {
        date: req.headers.date,
        host: req.hostname,
        ip: req.ip,
        url: req.url,
    };
    req.app.locals.error = error;
    req.app.locals.request = request;
    return res.status(error.code).render('error');
};
exports.InternalErrorRoute = InternalErrorRoute;
const NotFoundRoute = () => router.get('*', (req, res) => {
    const error = {
        code: 404,
        message: 'Not found',
    };
    const request = {
        date: req.headers.date,
        host: req.hostname,
        ip: req.ip,
        url: req.url,
    };
    req.app.locals.error = error;
    req.app.locals.request = request;
    return res.status(error.code).render('error');
});
exports.NotFoundRoute = NotFoundRoute;
//# sourceMappingURL=ErrorRoutes.js.map