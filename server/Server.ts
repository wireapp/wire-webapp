/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const expressSitemapXml = require('express-sitemap-xml');

import {CommonConfig} from '@wireapp/commons';
import * as express from 'express';
import * as hbs from 'hbs';
import * as helmet from 'helmet';
import * as http from 'http';
import * as path from 'path';
import {ServerConfig} from './config';
import HealthCheckRoute from './routes/_health/HealthRoute';
import ConfigRoute from './routes/config/ConfigRoute';
import {InternalErrorRoute, NotFoundRoute} from './routes/error/ErrorRoutes';
import RedirectRoutes from './routes/RedirectRoutes';
import Root from './routes/Root';
import * as BrowserUtil from './util/BrowserUtil';

const STATUS_CODE_MOVED = 301;
const STATUS_CODE_FOUND = 302;

class Server {
  private app: express.Express;
  private server?: http.Server;

  constructor(private config: ServerConfig) {
    if (this.config.SERVER.DEVELOPMENT) {
      console.log(this.config);
    }
    this.app = express();
    this.init();
  }

  private init(): void {
    // The order is important here, please don't sort!
    this.initTemplateEngine();
    this.initCaching();
    this.initForceSSL();
    this.initSecurityHeaders();
    this.initLatestBrowserRequired();
    this.initStaticRoutes();
    this.initWebpack();
    this.initSiteMap(this.config);
    this.app.use(Root(this.config));
    this.app.use(HealthCheckRoute());
    this.app.use(ConfigRoute(this.config));
    this.app.use(NotFoundRoute());
    this.app.use(InternalErrorRoute());
  }

  private initWebpack() {
    if (this.config.SERVER.DEVELOPMENT) {
      const webpackCompiler = require('webpack')(require('../webpack.config.dev'));
      const webpackDevMiddleware = require('webpack-dev-middleware');
      const webpackHotMiddleware = require('webpack-hot-middleware');

      this.app.use(webpackDevMiddleware(webpackCompiler));
      this.app.use(webpackHotMiddleware(webpackCompiler));
    }
  }

  private initCaching() {
    if (this.config.SERVER.DEVELOPMENT) {
      this.app.use(helmet.noCache());
    } else {
      this.app.use((req, res, next) => {
        const milliSeconds = 1000;
        res.header('Cache-Control', `public, max-age=${this.config.SERVER.CACHE_DURATION_SECONDS}`);
        res.header(
          'Expires',
          new Date(Date.now() + this.config.SERVER.CACHE_DURATION_SECONDS * milliSeconds).toUTCString()
        );
        next();
      });
    }
  }

  private initForceSSL(): void {
    const SSLMiddleware: express.RequestHandler = (req, res, next) => {
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

  private initSecurityHeaders() {
    this.app.disable('x-powered-by');
    this.app.use(
      helmet({
        frameguard: {action: 'deny'},
      })
    );
    this.app.use(helmet.noSniff());
    this.app.use(helmet.xssFilter());
    this.app.use(
      helmet.hsts({
        includeSubdomains: true,
        maxAge: 31536000,
        preload: true,
      })
    );
    this.app.use(
      helmet.contentSecurityPolicy({
        browserSniff: true,
        directives: this.config.SERVER.CSP,
        disableAndroid: false,
        loose: !this.config.SERVER.DEVELOPMENT,
        reportOnly: false,
        setAllHeaders: false,
      })
    );
    this.app.use(
      helmet.referrerPolicy({
        policy: 'same-origin',
      })
    );
  }

  private initStaticRoutes() {
    this.app.use(RedirectRoutes(this.config));

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

  public initLatestBrowserRequired() {
    this.app.use((req, res, next) => {
      const fileExtensionRegx = /\.[^/]+$/;
      const ignoredPath =
        fileExtensionRegx.test(req.path) ||
        req.path.startsWith('/test') ||
        req.path.startsWith('/demo') ||
        req.path.startsWith('/_health') ||
        req.path.startsWith('/join') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/google') ||
        req.path.startsWith('/apple-app-site-association') ||
        req.path.startsWith('/unsupported');

      if (ignoredPath || this.config.SERVER.DEVELOPMENT) {
        return next();
      }

      const userAgent = req.header('User-Agent');
      const parsedUserAgent = BrowserUtil.parseUserAgent(userAgent);
      const invalidBrowser = parsedUserAgent.is.mobile || parsedUserAgent.is.franz;

      const supportedBrowser = (() => {
        const browserName = parsedUserAgent.browser.name.toLowerCase();
        const supportedBrowserVersionObject = CommonConfig.WEBAPP_SUPPORTED_BROWSERS[browserName];
        const supportedBrowserVersion = supportedBrowserVersionObject && supportedBrowserVersionObject.major;

        try {
          const browserVersionString = (parsedUserAgent.browser.version.split('.') || [])[0];
          const browserVersion = parseInt(browserVersionString, 10);
          return supportedBrowserVersion && browserVersion >= supportedBrowserVersion;
        } catch (err) {
          return false;
        }
      })();

      if (!parsedUserAgent || invalidBrowser || !supportedBrowser) {
        return res.redirect(STATUS_CODE_FOUND, '/unsupported/');
      }

      return next();
    });
  }

  private initTemplateEngine() {
    this.app.set('view engine', 'html');
    this.app.engine('html', hbs.__express);
    this.app.set('views', [path.resolve(__dirname, 'static'), path.resolve(__dirname, 'templates')]);
    hbs.localsAsTemplateData(this.app);
    this.app.locals.config = this.config.CLIENT;
  }

  private initSiteMap(config: ServerConfig) {
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

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        reject('Server is already running.');
      } else if (this.config.SERVER.PORT_HTTP) {
        this.server = this.app.listen(this.config.SERVER.PORT_HTTP, () => resolve(this.config.SERVER.PORT_HTTP));
      } else {
        reject('Server port not specified.');
      }
    });
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.close();
      this.server = undefined;
    } else {
      throw new Error('Server is not running.');
    }
  }
}

export default Server;
