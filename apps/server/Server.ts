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

import express, {Router} from 'express';
import expressSitemapXml from 'express-sitemap-xml';
import hbs from 'hbs';
import helmet from 'helmet';
import {createProxyMiddleware} from 'http-proxy-middleware';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';
import nocache from 'nocache';

import fs from 'fs';
import http from 'http';
import https from 'https';
import net from 'net';
import path from 'path';

import type {ClientConfig, ServerConfig} from '@wireapp/config';

import {AppleAssociationRoute} from './routes/appleassociation/appleAssociationRoute';
import {parseClientVersion} from './routes/clientVersionCheck/clientVersion';
import {createClientVersionCheckRoute} from './routes/clientVersionCheck/clientVersionCheckRoute';
import {ConfigRoute} from './routes/config/configRoute';
import {InternalErrorRoute, NotFoundRoute} from './routes/error/errorRoutes';
import {GoogleWebmasterRoute} from './routes/googlewebmaster/googleWebmasterRoute';
import {HealthCheckRoute} from './routes/health/healthRoute';
import {RedirectRoutes} from './routes/redirectRoutes';
import {Root} from './routes/root';
import {replaceHostnameInObject} from './util/hostnameReplacer';

class Server {
  private readonly app: express.Express;
  private server?: http.Server | https.Server;
  private wsProxyUpgrade?: (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => void;

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

    this.app.use('/libs', express.static(path.join(__dirname, 'libs')));
    this.app.use(Root());
    this.app.use(HealthCheckRoute());
    this.app.use(ConfigRoute(this.config, this.clientConfig));
    this.app.use(GoogleWebmasterRoute(this.config));
    this.app.use(AppleAssociationRoute());
    this.initProxy();

    this.app.use(
      createClientVersionCheckRoute({
        router: Router(),
        parseClientVersion,
        deployedClientVersion: this.config.VERSION,
        isClientVersionEnforcementEnabled: this.config.ENABLE_CLIENT_VERSION_ENFORCEMENT,
      }),
    );
    this.app.use(NotFoundRoute());
    this.app.use(InternalErrorRoute());
  }

  private initProxy(): void {
    const restUpstream = process.env.BACKEND_REST_UPSTREAM;
    const wsUpstream = process.env.BACKEND_WS_UPSTREAM;

    // Ollama runs on plain HTTP; the Wire app is served over HTTPS. Browsers block
    // cross-protocol fetches (mixed content), so Ollama calls route through this proxy.
    // The client sends the actual Ollama URL in X-Ollama-Target (localhost only allowed).
    this.app.use(
      '/proxy/ollama',
      createProxyMiddleware({
        changeOrigin: true,
        pathRewrite: {'^/proxy/ollama': ''},
        router: req => {
          const raw = req.headers['x-ollama-target'];
          const target = Array.isArray(raw) ? raw[0] : raw;
          if (target) {
            try {
              const parsed = new URL(target);
              if (['localhost', '127.0.0.1'].includes(parsed.hostname)) {
                return target;
              }
            } catch {}
          }
          return 'http://localhost:11434';
        },
        on: {
          proxyReq: proxyReq => {
            proxyReq.removeHeader('origin');
            proxyReq.removeHeader('referer');
          },
        },
      }),
    );

    // Proxy Jira Cloud REST API calls. The browser sends X-Jira-Email and X-Jira-Token;
    // the proxy converts them to a Basic auth header before forwarding.
    this.app.use(
      '/proxy/jira',
      createProxyMiddleware({
        target: 'https://wearezeta.atlassian.net',
        changeOrigin: true,
        pathRewrite: {'^/proxy/jira': ''},
        on: {
          proxyReq: (proxyReq, req) => {
            const rawEmail = req.headers['x-jira-email'];
            const rawToken = req.headers['x-jira-token'];
            const email = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail;
            const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
            proxyReq.removeHeader('x-jira-email');
            proxyReq.removeHeader('x-jira-token');
            if (email && token) {
              const encoded = Buffer.from(`${email}:${token}`).toString('base64');
              proxyReq.setHeader('Authorization', `Basic ${encoded}`);
            }
          },
        },
      }),
    );

    // Proxy Wire backend REST API — requires BACKEND_REST_UPSTREAM env var.
    if (restUpstream !== undefined && restUpstream !== '') {
      this.app.use(
        '/proxy/api',
        createProxyMiddleware({
          target: restUpstream,
          changeOrigin: true,
          pathRewrite: {'^/proxy/api': ''},
          on: {
            proxyRes: proxyRes => {
              const cookies = proxyRes.headers['set-cookie'];
              if (cookies) {
                proxyRes.headers['set-cookie'] = cookies.map(cookie =>
                  cookie.replace(/;\s*Domain=[^;]*/i, '').replace(/;\s*Path=[^;]*/i, '; Path=/'),
                );
              }
            },
          },
        }),
      );
    }

    // Proxy Wire backend WebSocket — requires BACKEND_WS_UPSTREAM env var.
    if (wsUpstream !== undefined && wsUpstream !== '') {
      const wsProxy = createProxyMiddleware({
        target: wsUpstream,
        changeOrigin: true,
        ws: true,
        pathRewrite: {'^/proxy/ws': ''},
      });
      this.app.use('/proxy/ws', wsProxy);
      this.wsProxyUpgrade = wsProxy.upgrade;
    }
  }

  private initWebpack() {
    if (!this.config.DEVELOPMENT) {
      return;
    }

    const webpackCompiler = require('webpack')(require('../../webapp/webpack.config.dev'));
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
        // If the user agent adds a v param, it means that its requesting a particular version of the file and that could be cached forever since the file will never change.
        const hasCacheVersionParam = typeof req.query.v === 'string';
        const oneYear = 31536000;
        const maxAge = hasCacheVersionParam ? oneYear : this.config.CACHE_DURATION_SECONDS;
        const milliSeconds = 1000;
        res.header('Cache-Control', `public, max-age=${maxAge}`);
        res.header('Expires', new Date(Date.now() + maxAge * milliSeconds).toUTCString());
        next();
      });
    }
  }

  private initForceSSL(): void {
    const SSLMiddleware: express.RequestHandler = (req, res, next) => {
      const shouldEnforceHTTPS = !this.config.ENFORCE_HTTPS || req.url.match(/_health\/?/) !== null;
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
    this.app.use((req, res, next) => {
      helmet.contentSecurityPolicy({
        directives: this.config.ENABLE_DYNAMIC_HOSTNAME
          ? replaceHostnameInObject(this.config.CSP, req)
          : this.config.CSP,
        reportOnly: false,
      })(req, res, next);
    });
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
    // Scope clipboard delegation to self and the configured Collabora origin only.
    // Falls back to self-only when CELLS_PYDIO_URL is not configured.
    const collaboraOrigin = this.clientConfig.CELLS_PYDIO_URL;
    const clipboardAllowlist = collaboraOrigin ? `(self "${collaboraOrigin}")` : '(self)';
    this.app.use((_req, res, next) => {
      res.setHeader(
        'Permissions-Policy',
        `clipboard-read=${clipboardAllowlist}, clipboard-write=${clipboardAllowlist}`,
      );
      next();
    });
  }

  private initStaticRoutes() {
    this.app.use(RedirectRoutes(this.config));

    const staticRoutes = ['audio', 'ext', 'font', 'image', 'min', 'proto', 'style', 'worker', 'assets'];

    // Extension assets are loaded inside a sandboxed iframe (opaque origin) and as
    // ES-module worker/webview scripts. Two header overrides are required:
    //  - X-Frame-Options must NOT be DENY (helmet sets DENY globally), else the iframe
    //    document refuses to render. SAMEORIGIN is correct (host frames its own origin).
    //  - Access-Control-Allow-Origin: * lets the opaque-origin iframe fetch its
    //    `<script type="module" crossorigin>` assets without a CORS failure.
    const extensionStaticHeaders = (res: express.Response) => {
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('Access-Control-Allow-Origin', '*');
    };

    // Serve extension dist directories.
    // In development: serve directly from the hackathon project root (built via `bun run build:extensions`).
    // In production: serve from the server static dir (populated by webpack CopyPlugin).
    if (this.config.DEVELOPMENT) {
      // __dirname is apps/server/dist/ — go up 4 levels to reach hackathon/
      // Serve from the extension ROOT (not just dist) so plugin.json is reachable
      // at /extensions/{name}/plugin.json alongside /extensions/{name}/dist/...
      const extensionsRoot = path.resolve(__dirname, '..', '..', '..', '..', 'extensions');
      ['reports', 'jira', 'exports'].forEach(extName => {
        const extDir = path.join(extensionsRoot, extName);
        if (fs.existsSync(extDir)) {
          this.app.use(`/extensions/${extName}`, express.static(extDir, {setHeaders: extensionStaticHeaders}));
        }
      });
    } else {
      this.app.use('/extensions', express.static(path.join(__dirname, 'static/extensions'), {setHeaders: extensionStaticHeaders}));
    }

    staticRoutes.forEach(route => {
      this.app.use(`/${route}`, express.static(path.join(__dirname, `static/${route}`)));
    });

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
        req.path.startsWith('/unsupported') ||
        req.path.startsWith('/apple-app-site-association');

      if (ignoredPath) {
        return next();
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
      this.app.use(expressSitemapXml(pages, config.APP_BASE) as unknown as express.RequestHandler);
    }
  }

  start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this.server) {
        reject('Server is already running.');
      } else if (this.config.PORT_HTTP) {
        if (this.config.DEVELOPMENT && this.config.DEVELOPMENT_ENABLE_TLS) {
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
        if (this.wsProxyUpgrade) {
          this.server.on('upgrade', this.wsProxyUpgrade);
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
