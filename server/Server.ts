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

import express from 'express';
import expressSitemapXml from 'express-sitemap-xml';
import hbs from 'hbs';
import helmet from 'helmet';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import nocache from 'nocache';

import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';

import type {ClientConfig, ServerConfig} from './config';
import {HealthCheckRoute} from './routes/_health/HealthRoute';
import {AppleAssociationRoute} from './routes/appleassociation/AppleAssociationRoute';
import {ConfigRoute} from './routes/config/ConfigRoute';
import {InternalErrorRoute, NotFoundRoute} from './routes/error/ErrorRoutes';
import {GoogleWebmasterRoute} from './routes/googlewebmaster/GoogleWebmasterRoute';
import {RedirectRoutes} from './routes/RedirectRoutes';
import {Root} from './routes/Root';
import * as BrowserUtil from './util/BrowserUtil';

class Server {
  private readonly app: express.Express;
  private server?: http.Server | https.Server;

  constructor(
    private readonly config: ServerConfig,
    private readonly clientConfig: ClientConfig,
  ) {
    if (this.config.DEVELOPMENT) {
      console.info(this.config);
    } else if (!this.config.APP_BASE.startsWith('https')) {
      throw new Error(`Config variable 'APP_BASE' must be protocol https but is '${this.config.APP_BASE}'`);
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
    this.app.use(Root());
    this.app.use(HealthCheckRoute());
    this.app.use(ConfigRoute(this.config, this.clientConfig));
    this.app.use(GoogleWebmasterRoute(this.config));
    this.app.use(AppleAssociationRoute());
    this.app.use(NotFoundRoute());
    this.app.use(InternalErrorRoute());
  }

  private initWebpack() {
    if (!this.config.DEVELOPMENT) {
      return;
    }

    const webpackCompiler = require('webpack')(require('../../webpack.config.dev'));
    const webpackDevMiddleware = require('webpack-dev-middleware');
    const webpackHotMiddleware = require('webpack-hot-middleware');

    this.app.use(webpackDevMiddleware(webpackCompiler));
    this.app.use(webpackHotMiddleware(webpackCompiler));
  }

  private initCaching() {
    if (this.config.DEVELOPMENT) {
      this.app.use(nocache());
    } else {
      this.app.use((req, res, next) => {
        const milliSeconds = 1000;
        res.header('Cache-Control', `public, max-age=${this.config.CACHE_DURATION_SECONDS}`);
        res.header('Expires', new Date(Date.now() + this.config.CACHE_DURATION_SECONDS * milliSeconds).toUTCString());
        next();
      });
    }
  }

  private initForceSSL(): void {
    const SSLMiddleware: express.RequestHandler = (req, res, next) => {
      const shouldEnforceHTTPS = !this.config.ENFORCE_HTTPS || req.url.match(/_health\/?/);
      const isInsecure = !req.secure || req.get('X-Forwarded-Proto') !== 'https';

      if (isInsecure && !shouldEnforceHTTPS) {
        return res.redirect(HTTP_STATUS.MOVED_PERMANENTLY, `${this.config.APP_BASE}${req.url}`);
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
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        frameguard: {action: 'deny'},
      }),
    );
    this.app.use(helmet.noSniff());
    this.app.use(helmet.xssFilter());
    this.app.use(
      helmet.hsts({
        includeSubDomains: true,
        maxAge: 31536000,
        preload: true,
      }),
    );
    this.app.use(
      helmet.contentSecurityPolicy({
        directives: this.config.CSP,
        reportOnly: false,
      }),
    );
    this.app.use(
      helmet.referrerPolicy({
        policy: 'same-origin',
      }),
    );
    // With helmet v4 the X-XSS-Protection header is set to `0` by default.
    // After discussing this with @franziskuskiefer we want to keep this enabled for old browsers.
    // https://github.com/helmetjs/helmet/issues/230
    this.app.use((_req, res, next) => {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  private initStaticRoutes() {
    this.app.use(RedirectRoutes(this.config, this.clientConfig));

    this.app.use('/audio', express.static(path.join(__dirname, 'static/audio')));
    this.app.use('/ext', express.static(path.join(__dirname, 'static/ext')));
    this.app.use('/font', express.static(path.join(__dirname, 'static/font')));
    this.app.use('/image', express.static(path.join(__dirname, 'static/image')));
    this.app.use('/min', express.static(path.join(__dirname, 'static/min')));
    this.app.use('/proto', express.static(path.join(__dirname, 'static/proto')));
    this.app.use('/style', express.static(path.join(__dirname, 'static/style')));
    this.app.use('/worker', express.static(path.join(__dirname, 'static/worker')));

    this.app.get('/favicon.ico', (_req, res) => res.sendFile(path.join(__dirname, 'static/image/favicon.ico')));
    if (!this.config.DEVELOPMENT) {
      this.app.get('/sw.js', (_req, res) => res.sendFile(path.join(__dirname, 'static/sw.js')));
    }
  }

  public initLatestBrowserRequired() {
    this.app.use((req, res, next) => {
      const fileExtensionRegx = /\.[^/]+$/;
      const ignoredPath =
        fileExtensionRegx.test(req.path) ||
        req.path.startsWith('/commit') ||
        req.path.startsWith('/test') ||
        req.path.startsWith('/_health') ||
        req.path.startsWith('/join') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/google') ||
        req.path.startsWith('/apple-app-site-association');

      if (ignoredPath) {
        return next();
      }

      const userAgent = req.header('User-Agent');
      if (!BrowserUtil.isSupportedBrowser(userAgent)) {
        return res.redirect(HTTP_STATUS.MOVED_TEMPORARILY, '/auth/');
      }
      return next();
    });
  }

  private initTemplateEngine() {
    this.app.set('view engine', 'html');
    this.app.engine('html', hbs.__express);
    this.app.set('views', [path.resolve(__dirname, 'static'), path.resolve(__dirname, 'templates')]);
    hbs.localsAsTemplateData(this.app);
    this.app.locals.config = {
      APP_BASE: this.config.APP_BASE,
      OPEN_GRAPH: this.config.OPEN_GRAPH,
      VERSION: this.config.VERSION,
    };
  }

  private initSiteMap(config: ServerConfig) {
    if (config.APP_BASE) {
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
      this.app.use(expressSitemapXml(pages, config.APP_BASE));
    }
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        reject('Server is already running.');
      } else if (this.config.PORT_HTTP) {
        if (this.config.DEVELOPMENT) {
          const options = {
            cert: fs.readFileSync(this.config.SSL_CERTIFICATE_PATH),
            key: fs.readFileSync(this.config.SSL_CERTIFICATE_KEY_PATH),
          };
          this.server = https
            .createServer(options, this.app)
            .listen(this.config.PORT_HTTP, '0.0.0.0', () => resolve(this.config.PORT_HTTP));
        } else {
          this.server = this.app.listen(this.config.PORT_HTTP, '0.0.0.0', () => resolve(this.config.PORT_HTTP));
        }
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

export {Server};
