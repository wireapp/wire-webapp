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

import type {Configuration, rspack as rspackFactory} from '@rspack/core';
import type {RspackDevServer} from '@rspack/dev-server';
import {isNullOrUndefined, isObject, isString, isTruthy} from '@sindresorhus/is';
import express, {Router} from 'express';
import expressSitemapXml from 'express-sitemap-xml';
import hbs from 'hbs';
import helmet, {contentSecurityPolicy, hsts, noSniff, referrerPolicy, xssFilter} from 'helmet';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import nocache from 'nocache';

import fs from 'fs';
import http from 'http';
import https from 'https';
import {createRequire} from 'node:module';
import path from 'path';

import type {BuildMetadata, ClientConfig, ServerConfig} from '@wireapp/config';

import {AppleAssociationRoute} from './routes/appleassociation/appleAssociationRoute';
import {createClientVersionCheckRoute} from './routes/clientVersionCheck/clientVersionCheckRoute';
import {ConfigRoute} from './routes/config/configRoute';
import {InternalErrorRoute, NotFoundRoute} from './routes/error/errorRoutes';
import {GoogleWebmasterRoute} from './routes/googlewebmaster/googleWebmasterRoute';
import {HealthCheckRoute} from './routes/health/healthRoute';
import {RedirectRoutes} from './routes/redirectRoutes';
import {Root} from './routes/root';
import {replaceHostnameInObject} from './util/hostnameReplacer';

type SitemapPage = {
  changeFreq: string;
  url: string;
};

class Server {
  private readonly app: express.Express;
  private readonly staticAssetsApp: express.Express;
  private readonly routesApp: express.Express;
  private server?: http.Server | https.Server;
  private developmentServer?: RspackDevServer;

  constructor(
    private readonly config: ServerConfig,
    private readonly clientConfig: ClientConfig,
    private readonly buildMetadata: BuildMetadata,
  ) {
    if (this.config.DEVELOPMENT) {
      console.info(this.config);
    } else if (!this.config.APP_BASE.startsWith('https')) {
      throw new Error(`Config variable 'APP_BASE' must be protocol https but is '${this.config.APP_BASE}'`);
    }

    this.app = express();
    this.app.disable('x-powered-by');
    this.staticAssetsApp = express();
    this.routesApp = express();
    this.routesApp.disable('x-powered-by');
    this.init();
  }

  private init(): void {
    // The order is important here, please don't sort!
    this.routesApp.enable('trust proxy');
    this.initTemplateEngine(this.routesApp);
    this.initCaching(this.staticAssetsApp);
    this.initForceSSL(this.staticAssetsApp);
    this.initSecurityHeaders(this.staticAssetsApp);
    this.initLatestBrowserRequired();
    this.initStaticRoutes(this.staticAssetsApp);
    this.initSiteMap(this.routesApp, this.config);

    this.routesApp.use('/libs', express.static(path.join(__dirname, 'libs')));
    this.routesApp.use(Root());
    this.routesApp.use(HealthCheckRoute());
    this.routesApp.use(ConfigRoute(this.config, this.clientConfig));
    this.routesApp.use(GoogleWebmasterRoute(this.config));
    this.routesApp.use(AppleAssociationRoute());

    this.routesApp.use(
      createClientVersionCheckRoute({
        router: Router(),
        deployedAssetVersion: this.buildMetadata.assetVersion,
        isClientVersionEnforcementEnabled: this.config.ENABLE_CLIENT_VERSION_ENFORCEMENT,
      }),
    );
    this.routesApp.use(NotFoundRoute());
    this.routesApp.use(InternalErrorRoute());

    this.app.use(this.staticAssetsApp);
    this.app.use(this.routesApp);
  }

  private initCaching(application: express.Express): void {
    if (this.config.DEVELOPMENT) {
      application.use(nocache());
    } else {
      application.use((req, res, next) => {
        // If the user agent adds a v param, it means that its requesting a particular version of the file and that could be cached forever since the file will never change.
        const hasCacheVersionParam = isString(req.query.v);
        const oneYear = 31536000;
        const maxAge = hasCacheVersionParam ? oneYear : this.config.CACHE_DURATION_SECONDS;
        const milliSeconds = 1000;
        res.header('Cache-Control', `public, max-age=${maxAge}`);
        res.header('Expires', new Date(Date.now() + maxAge * milliSeconds).toUTCString());
        next();
      });
    }
  }

  private initForceSSL(application: express.Express): void {
    const SSLMiddleware: express.RequestHandler = (req, res, next) => {
      const shouldEnforceHTTPS = !this.config.ENFORCE_HTTPS || isTruthy(req.url.match(/_health\/?/));
      const isInsecure = !req.secure || req.get('X-Forwarded-Proto') !== 'https';

      if (isInsecure && !shouldEnforceHTTPS) {
        return res.redirect(HTTP_STATUS.MOVED_PERMANENTLY, `${this.config.APP_BASE}${req.url}`);
      }

      next();
    };

    application.enable('trust proxy');
    application.use(SSLMiddleware);
  }

  private initSecurityHeaders(application: express.Express): void {
    application.disable('x-powered-by');
    application.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        crossOriginOpenerPolicy: false,
        frameguard: {action: 'deny'},
      }),
    );
    application.use(noSniff());
    application.use(xssFilter());
    application.use(
      hsts({
        includeSubDomains: true,
        maxAge: 31536000,
        preload: true,
      }),
    );
    application.use((req, res, next) => {
      const contentSecurityPolicyDirectives = this.config.ENABLE_DYNAMIC_HOSTNAME
        ? replaceHostnameInObject(this.config.CSP, req)
        : this.config.CSP;
      const requestHost = req.get('host');
      const directives =
        this.config.DEVELOPMENT && isString(requestHost)
          ? {
              ...contentSecurityPolicyDirectives,
              connectSrc: [
                ...(contentSecurityPolicyDirectives.connectSrc ?? []),
                `${req.secure ? 'wss' : 'ws'}://${requestHost}`,
              ],
            }
          : contentSecurityPolicyDirectives;

      contentSecurityPolicy({directives, reportOnly: false})(req, res, next);
    });
    application.use(
      referrerPolicy({
        policy: 'same-origin',
      }),
    );
    // With helmet v4 the X-XSS-Protection header is set to `0` by default.
    // After discussing this with @franziskuskiefer we want to keep this enabled for old browsers.
    // https://github.com/helmetjs/helmet/issues/230
    application.use((_req, res, next) => {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
    // Scope clipboard delegation to self and the configured Collabora origin only.
    // Falls back to self-only when CELLS_PYDIO_URL is not configured.
    const collaboraOrigin = this.clientConfig.CELLS_PYDIO_URL;
    const clipboardAllowlist = Boolean(collaboraOrigin) ? `(self "${collaboraOrigin}")` : '(self)';
    application.use((_req, res, next) => {
      res.setHeader(
        'Permissions-Policy',
        `clipboard-read=${clipboardAllowlist}, clipboard-write=${clipboardAllowlist}`,
      );
      next();
    });
  }

  private initStaticRoutes(application: express.Express): void {
    application.use(RedirectRoutes(this.config, this.buildMetadata));

    const staticRoutes = ['audio', 'ext', 'font', 'image', 'min', 'proto', 'style', 'worker', 'assets'];

    staticRoutes.forEach(route => {
      application.use(`/${route}`, express.static(path.join(__dirname, `static/${route}`)));
    });

    application.get('/favicon.ico', (_req, res) => {
      return res.sendFile(path.join(__dirname, 'static/image/favicon.ico'));
    });
  }

  public initLatestBrowserRequired(): void {
    this.staticAssetsApp.use((req, res, next) => {
      const fileExtensionRegx = /\.[^/]+$/;
      const ignoredPath =
        fileExtensionRegx.test(req.path) ||
        req.path.startsWith('/commit') ||
        req.path.startsWith('/test') ||
        req.path.startsWith('/_health') ||
        req.path.startsWith('/join') ||
        req.path.startsWith('/auth') ||
        req.path.startsWith('/google') ||
        req.path.startsWith('/unsupported') ||
        req.path.startsWith('/apple-app-site-association');

      if (ignoredPath) {
        return next();
      }

      return next();
    });
  }

  private initTemplateEngine(application: express.Express): void {
    application.set('view engine', 'html');
    application.engine('html', hbs.__express);
    application.set('views', [path.resolve(__dirname, 'static'), path.resolve(__dirname, 'templates')]);
    hbs.localsAsTemplateData(application);
    application.locals.config = {
      APP_BASE: this.config.APP_BASE,
      OPEN_GRAPH: this.config.OPEN_GRAPH,
      VERSION: this.config.VERSION,
    };
  }

  private initSiteMap(application: express.Express, config: ServerConfig): void {
    if (Boolean(config.APP_BASE)) {
      const pages = (): SitemapPage[] => {
        return [
          {
            changeFreq: 'weekly',
            url: '/auth/',
          },
          {
            changeFreq: 'weekly',
            url: '/',
          },
        ];
      };
      application.use(expressSitemapXml(pages, config.APP_BASE) as unknown as express.RequestHandler);
    }
  }

  async start(): Promise<number> {
    if (isTruthy(this.server) || isTruthy(this.developmentServer)) {
      throw new Error('Server is already running.');
    }

    if (this.config.PORT_HTTP < 0 || (!this.config.DEVELOPMENT && this.config.PORT_HTTP === 0)) {
      throw new Error('Server port not specified.');
    }

    if (this.config.DEVELOPMENT) {
      return this.startRspackDevelopmentServer();
    }

    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.config.PORT_HTTP, '0.0.0.0', () => {
        resolve(this.config.PORT_HTTP);
      });
      this.server.once('error', reject);
    });
  }

  private async startRspackDevelopmentServer(): Promise<number> {
    const rspackConfigurationPath = path.resolve(process.cwd(), 'apps/webapp/rspack.config.dev.mts');
    const nativeRequire = createRequire(__filename);
    type RspackCoreModule = {readonly rspack: typeof rspackFactory};
    type RspackDevServerModule = {readonly RspackDevServer: typeof RspackDevServer};
    const rspackCore = nativeRequire('@rspack/core') as RspackCoreModule;
    const rspackDevServer = nativeRequire('@rspack/dev-server') as RspackDevServerModule;
    const configurationModule = nativeRequire(rspackConfigurationPath) as {readonly default: Configuration};
    const rspackConfiguration = configurationModule.default;

    if (!isObject(rspackConfiguration.devServer)) {
      throw new Error('The Rspack development configuration must define devServer options.');
    }

    const appBaseHostname = new URL(this.config.APP_BASE).hostname;
    const serverOptions = this.config.DEVELOPMENT_ENABLE_TLS
      ? {
          type: 'https' as const,
          options: {
            cert: fs.readFileSync(this.config.SSL_CERTIFICATE_PATH),
            key: fs.readFileSync(this.config.SSL_CERTIFICATE_KEY_PATH),
          },
        }
      : {type: 'http' as const};
    const compiler = rspackCore.rspack(rspackConfiguration);
    const developmentServer = new rspackDevServer.RspackDevServer(
      {
        ...rspackConfiguration.devServer,
        allowedHosts: [appBaseHostname, 'localhost', '127.0.0.1'],
        app: async () => {
          const application = express();
          application.disable('x-powered-by');

          return application;
        },
        host: '0.0.0.0',
        port: this.config.PORT_HTTP,
        server: serverOptions,
        setupMiddlewares: middlewares => {
          const rspackDevMiddlewareIndex = middlewares.findIndex(middleware => {
            return isObject(middleware) && middleware.name === '@rspack/dev-middleware';
          });

          if (rspackDevMiddlewareIndex < 0) {
            throw new Error('Rspack development middleware was not registered by the development server.');
          }

          return [
            ...middlewares.slice(0, rspackDevMiddlewareIndex),
            {name: 'wire-server-static-assets-and-security', middleware: this.staticAssetsApp},
            ...middlewares.slice(rspackDevMiddlewareIndex),
            {name: 'wire-server-routes', middleware: this.routesApp},
          ];
        },
      },
      compiler,
    );
    this.developmentServer = developmentServer;

    try {
      await developmentServer.start();
    } catch (error: unknown) {
      await developmentServer.stop();
      this.developmentServer = undefined;
      throw error;
    }

    const address = developmentServer.server?.address();

    if (isNullOrUndefined(address) || isString(address)) {
      return this.config.PORT_HTTP;
    }

    return address.port;
  }

  async stop(): Promise<void> {
    if (isTruthy(this.developmentServer)) {
      const developmentServer = this.developmentServer;
      await developmentServer.stop();
      this.developmentServer = undefined;

      return;
    }

    if (!isTruthy(this.server)) {
      throw new Error('Server is not running.');
    }

    const httpServer = this.server;
    await new Promise<void>((resolve, reject) => {
      httpServer.close(error => {
        if (isTruthy(error)) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    this.server = undefined;
  }
}

export {Server};
