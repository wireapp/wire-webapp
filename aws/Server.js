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
const expressSitemapXml = require('express-sitemap-xml');
const commons_1 = require("@wireapp/commons");
const express = require("express");
const hbs = require("hbs");
const helmet = require("helmet");
const path = require("path");
const HealthRoute_1 = require("./routes/_health/HealthRoute");
const ConfigRoute_1 = require("./routes/config/ConfigRoute");
const ErrorRoutes_1 = require("./routes/error/ErrorRoutes");
const RedirectRoutes_1 = require("./routes/RedirectRoutes");
const Root_1 = require("./routes/Root");
const BrowserUtil = require("./util/BrowserUtil");
const STATUS_CODE_MOVED = 301;
const STATUS_CODE_FOUND = 302;
class Server {
    constructor(config) {
        this.config = config;
        if (this.config.SERVER.DEVELOPMENT) {
            console.log(this.config);
        }
        this.app = express();
        this.init();
    }
    init() {
        this.initTemplateEngine();
        this.initCaching();
        this.initForceSSL();
        this.initSecurityHeaders();
        this.initLatestBrowserRequired();
        this.initStaticRoutes();
        this.initWebpack();
        this.initSiteMap(this.config);
        this.app.use(Root_1.default(this.config));
        this.app.use(HealthRoute_1.default());
        this.app.use(ConfigRoute_1.default(this.config));
        this.app.use(ErrorRoutes_1.NotFoundRoute());
        this.app.use(ErrorRoutes_1.InternalErrorRoute());
    }
    initWebpack() {
        if (this.config.SERVER.DEVELOPMENT) {
            const webpackCompiler = require('webpack')(require('../webpack.config.dev'));
            const webpackDevMiddleware = require('webpack-dev-middleware');
            const webpackHotMiddleware = require('webpack-hot-middleware');
            this.app.use(webpackDevMiddleware(webpackCompiler));
            this.app.use(webpackHotMiddleware(webpackCompiler));
        }
    }
    initCaching() {
        if (this.config.SERVER.DEVELOPMENT) {
            this.app.use(helmet.noCache());
        }
        else {
            this.app.use((req, res, next) => {
                const milliSeconds = 1000;
                res.header('Cache-Control', `public, max-age=${this.config.SERVER.CACHE_DURATION_SECONDS}`);
                res.header('Expires', new Date(Date.now() + this.config.SERVER.CACHE_DURATION_SECONDS * milliSeconds).toUTCString());
                next();
            });
        }
    }
    initForceSSL() {
        const SSLMiddleware = (req, res, next) => {
            const shouldEnforceHTTPS = !this.config.SERVER.ENFORCE_HTTPS || req.url.match(/_health\/?/);
            const isInsecure = !req.secure || req.get('X-Forwarded-Proto') !== 'https';
            if (isInsecure && !shouldEnforceHTTPS) {
                return res.redirect(STATUS_CODE_MOVED, `https://${req.headers.host}${req.url}`);
            }
            next();
        };
        this.app.enable('trust proxy');
        this.app.use(SSLMiddleware);
    }
    initSecurityHeaders() {
        this.app.disable('x-powered-by');
        this.app.use(helmet({
            frameguard: { action: 'deny' },
        }));
        this.app.use(helmet.noSniff());
        this.app.use(helmet.xssFilter());
        this.app.use(helmet.hsts({
            includeSubdomains: true,
            maxAge: 31536000,
            preload: true,
        }));
        this.app.use(helmet.contentSecurityPolicy({
            browserSniff: true,
            directives: this.config.SERVER.CSP,
            disableAndroid: false,
            loose: !this.config.SERVER.DEVELOPMENT,
            reportOnly: false,
            setAllHeaders: false,
        }));
        this.app.use(helmet.referrerPolicy({
            policy: 'same-origin',
        }));
    }
    initStaticRoutes() {
        this.app.use(RedirectRoutes_1.default(this.config));
        this.app.use('/audio', express.static(path.join(__dirname, 'static', 'audio')));
        this.app.use('/ext', express.static(path.join(__dirname, 'static', 'ext')));
        this.app.use('/font', express.static(path.join(__dirname, 'static', 'font')));
        this.app.use('/image', express.static(path.join(__dirname, 'static', 'image')));
        this.app.use('/min', express.static(path.join(__dirname, 'static', 'min')));
        this.app.use('/style', express.static(path.join(__dirname, 'static', 'style')));
        this.app.use('/worker', express.static(path.join(__dirname, 'static', 'worker')));
        this.app.get('/favicon.ico', (req, res) => res.sendFile(path.join(__dirname, 'static', 'favicon.ico')));
        this.app.get('/sw.js', (req, res) => res.sendFile(path.join(__dirname, 'static', 'sw.js')));
    }
    initLatestBrowserRequired() {
        this.app.use((req, res, next) => {
            const fileExtensionRegx = /\.[^/]+$/;
            const ignoredPath = fileExtensionRegx.test(req.path) ||
                req.path.startsWith('/commit') ||
                req.path.startsWith('/test') ||
                req.path.startsWith('/demo') ||
                req.path.startsWith('/_health') ||
                req.path.startsWith('/join') ||
                req.path.startsWith('/auth') ||
                req.path.startsWith('/google') ||
                req.path.startsWith('/apple-app-site-association');
            if (ignoredPath) {
                return next();
            }
            const userAgent = req.header('User-Agent');
            const parsedUserAgent = BrowserUtil.parseUserAgent(userAgent);
            if (parsedUserAgent) {
                const invalidBrowser = parsedUserAgent.is.mobile || parsedUserAgent.is.franz;
                const supportedBrowser = (() => {
                    const browserName = parsedUserAgent.browser.name.toLowerCase();
                    const supportedBrowserVersionObject = commons_1.CommonConfig.WEBAPP_SUPPORTED_BROWSERS[browserName];
                    const supportedBrowserVersion = supportedBrowserVersionObject && supportedBrowserVersionObject.major;
                    try {
                        const browserVersionString = (parsedUserAgent.browser.version.split('.') || [])[0];
                        const browserVersion = parseInt(browserVersionString, 10);
                        return supportedBrowserVersion && browserVersion >= supportedBrowserVersion;
                    }
                    catch (err) {
                        return false;
                    }
                })();
                if (invalidBrowser || !supportedBrowser) {
                    return res.redirect(STATUS_CODE_FOUND, `${this.config.CLIENT.URL.WEBSITE_BASE}/unsupported/`);
                }
            }
            else {
                return res.redirect(STATUS_CODE_FOUND, `${this.config.CLIENT.URL.WEBSITE_BASE}/unsupported/`);
            }
            return next();
        });
    }
    initTemplateEngine() {
        this.app.set('view engine', 'html');
        this.app.engine('html', hbs.__express);
        this.app.set('views', [path.resolve(__dirname, 'static'), path.resolve(__dirname, 'templates')]);
        hbs.localsAsTemplateData(this.app);
        this.app.locals.config = this.config.CLIENT;
    }
    initSiteMap(config) {
        if (config.SERVER.APP_BASE) {
            const pages = () => [
                {
                    changeFreq: 'weekly',
                    url: '/auth/',
                },
                {
                    changeFreq: 'weekly',
                    url: '/',
                },
            ];
            this.app.use(expressSitemapXml(pages, config.SERVER.APP_BASE));
        }
    }
    start() {
        return new Promise((resolve, reject) => {
            if (this.server) {
                reject('Server is already running.');
            }
            else if (this.config.SERVER.PORT_HTTP) {
                this.server = this.app.listen(this.config.SERVER.PORT_HTTP, () => resolve(this.config.SERVER.PORT_HTTP));
            }
            else {
                reject('Server port not specified.');
            }
        });
    }
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.server) {
                this.server.close();
                this.server = undefined;
            }
            else {
                throw new Error('Server is not running.');
            }
        });
    }
}
exports.default = Server;
//# sourceMappingURL=Server.js.map