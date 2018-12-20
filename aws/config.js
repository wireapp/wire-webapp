"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const fs = require("fs-extra");
const logdown = require("logdown");
const path = require("path");
const nodeEnvironment = process.env.NODE_ENV || 'production';
const COMMIT_FILE = path.join(__dirname, 'commit');
const ROBOTS_DIR = path.join(__dirname, 'robots');
const ROBOTS_ALLOW_FILE = path.join(ROBOTS_DIR, 'robots.txt');
const ROBOTS_DISALLOW_FILE = path.join(ROBOTS_DIR, 'robots-disallow.txt');
const VERSION_FILE = path.join(__dirname, 'version');
if (nodeEnvironment === 'development') {
    dotenv.config();
}
const defaultCSP = {
    connectSrc: [
        "'self'",
        'blob:',
        'data:',
        'https://wire.com',
        'https://www.google.com',
        'https://*.giphy.com',
        'https://*.unsplash.com',
        'https://apis.google.com',
    ],
    defaultSrc: ["'self'"],
    fontSrc: ["'self'", 'data:'],
    frameSrc: [
        'https://*.soundcloud.com',
        'https://*.spotify.com',
        'https://*.vimeo.com',
        'https://*.youtube-nocookie.com',
        'https://accounts.google.com',
    ],
    imgSrc: [
        "'self'",
        'blob:',
        'data:',
        'https://*.cloudfront.net',
        'https://*.giphy.com',
        'https://1-ps.googleusercontent.com',
        'https://csi.gstatic.com',
    ],
    manifestSrc: [],
    mediaSrc: ["'self'", 'blob:', 'data:', '*'],
    objectSrc: ["'self'", 'https://*.youtube-nocookie.com', 'https://1-ps.googleusercontent.com'],
    prefetchSrc: [],
    scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'", 'https://apis.google.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://*.googleusercontent.com'],
    workerSrc: [],
};
const logger = logdown('config', {
    logger: console,
    markdown: false,
});
function readFile(path, fallback) {
    try {
        return fs.readFileSync(path, { encoding: 'utf8', flag: 'r' });
    }
    catch (error) {
        logger.warn(`Cannot access "${path}": ${error.message}`);
        return fallback;
    }
}
function parseCommaSeparatedList(list = '') {
    const cleanedList = list.replace(/\s/g, '');
    if (!cleanedList) {
        return [];
    }
    return cleanedList.split(',');
}
function mergedCSP() {
    const csp = {
        connectSrc: [
            ...defaultCSP.connectSrc,
            process.env.BACKEND_REST,
            process.env.BACKEND_WS,
            ...parseCommaSeparatedList(process.env.CSP_EXTRA_CONNECT_SRC),
        ],
        defaultSrc: [...defaultCSP.defaultSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_DEFAULT_SRC)],
        fontSrc: [...defaultCSP.fontSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_FONT_SRC)],
        frameSrc: [...defaultCSP.frameSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_FRAME_SRC)],
        imgSrc: [...defaultCSP.imgSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_IMG_SRC)],
        manifestSrc: [...defaultCSP.manifestSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_MANIFEST_SRC)],
        mediaSrc: [...defaultCSP.mediaSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_MEDIA_SRC)],
        objectSrc: [...defaultCSP.objectSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_OBJECT_SRC)],
        prefetchSrc: [...defaultCSP.prefetchSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_PREFETCH_SRC)],
        scriptSrc: [...defaultCSP.scriptSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_SCRIPT_SRC)],
        styleSrc: [...defaultCSP.styleSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_STYLE_SRC)],
        workerSrc: [...defaultCSP.workerSrc, ...parseCommaSeparatedList(process.env.CSP_EXTRA_WORKER_SRC)],
    };
    return Object.entries(csp)
        .filter(([key, value]) => !!value.length)
        .reduce((accumulator, [key, value]) => (Object.assign({}, accumulator, { [key]: value })), {});
}
const config = {
    CLIENT: {
        ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
        APP_NAME: process.env.APP_NAME,
        BACKEND_REST: process.env.BACKEND_REST,
        BACKEND_WS: process.env.BACKEND_WS,
        ENVIRONMENT: nodeEnvironment,
        FEATURE: {
            CHECK_CONSENT: process.env.FEATURE_CHECK_CONSENT == 'false' ? false : true,
            ENABLE_DEBUG: process.env.FEATURE_ENABLE_DEBUG == 'true' ? true : false,
            ENABLE_SSO: process.env.FEATURE_ENABLE_SSO == 'true' ? true : false,
        },
        RAYGUN_API_KEY: process.env.RAYGUN_API_KEY,
        URL: {
            ACCOUNT_BASE: process.env.URL_ACCOUNT_BASE,
            MOBILE_BASE: process.env.URL_MOBILE_BASE,
            TEAMS_BASE: process.env.URL_TEAMS_BASE,
            WEBSITE_BASE: process.env.URL_WEBSITE_BASE,
        },
        VERSION: readFile(VERSION_FILE, '0.0.0'),
    },
    COMMIT: readFile(COMMIT_FILE, ''),
    SERVER: {
        APP_BASE: process.env.APP_BASE,
        CACHE_DURATION_SECONDS: 300,
        CSP: mergedCSP(),
        DEVELOPMENT: nodeEnvironment === 'development',
        ENFORCE_HTTPS: process.env.ENFORCE_HTTPS == 'false' ? false : true,
        ENVIRONMENT: nodeEnvironment,
        PORT_HTTP: Number(process.env.PORT) || 21080,
        ROBOTS: {
            ALLOW: readFile(ROBOTS_ALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
            ALLOWED_HOSTS: ['app.wire.com'],
            DISALLOW: readFile(ROBOTS_DISALLOW_FILE, 'User-agent: *\r\nDisallow: /'),
        },
    },
};
exports.default = config;
//# sourceMappingURL=config.js.map