/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {generateConfig} from './server.config';
import {ConfigGeneratorParams} from './config.types';
import {Env} from './env';

describe('Server Config', () => {
  const mockParams: ConfigGeneratorParams = {
    commit: 'abc123',
    version: '1.0.0',
    env: 'production',
    urls: {
      base: 'https://app.wire.com',
      api: 'https://prod-nginz-https.wire.com',
      ws: 'wss://prod-nginz-ssl.wire.com',
    },
  };

  const mockEnv = {
    NODE_ENV: 'production',
    PORT: '21080',
    ENFORCE_HTTPS: 'true',
    GOOGLE_WEBMASTER_ID: 'test-google-id',
    OPEN_GRAPH_DESCRIPTION: 'Wire secure messenger',
    OPEN_GRAPH_IMAGE_URL: 'https://wire.com/image.png',
    OPEN_GRAPH_TITLE: 'Wire',
    CSP_EXTRA_CONNECT_SRC: '',
    CSP_EXTRA_DEFAULT_SRC: '',
    CSP_EXTRA_FONT_SRC: '',
    CSP_EXTRA_FRAME_SRC: '',
    CSP_EXTRA_IMG_SRC: '',
    CSP_EXTRA_MANIFEST_SRC: '',
    CSP_EXTRA_MEDIA_SRC: '',
    CSP_EXTRA_OBJECT_SRC: '',
    CSP_EXTRA_SCRIPT_SRC: '',
    CSP_EXTRA_STYLE_SRC: '',
    CSP_EXTRA_WORKER_SRC: '',
    FEATURE_ENABLE_DEBUG: 'false',
  } as Env;

  describe('generateConfig', () => {
    it('should generate a valid server config', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config).toBeDefined();
      expect(config.VERSION).toBe('1.0.0');
      expect(config.COMMIT).toBe('abc123');
      expect(config.ENVIRONMENT).toBe('production');
    });

    it('should map URL parameters correctly', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.APP_BASE).toBe('https://app.wire.com');
      expect(config.BACKEND_REST).toBe('https://prod-nginz-https.wire.com');
      expect(config.BACKEND_WS).toBe('wss://prod-nginz-ssl.wire.com');
    });

    it('should parse PORT correctly with default', () => {
      const config = generateConfig(mockParams, mockEnv);
      expect(config.PORT_HTTP).toBe(21080);

      const envWithoutPort = {...mockEnv, PORT: ''};
      const configWithDefault = generateConfig(mockParams, envWithoutPort);
      expect(configWithDefault.PORT_HTTP).toBe(21080);
    });

    it('should handle ENFORCE_HTTPS flag', () => {
      const envWithHttpsTrue = {...mockEnv, ENFORCE_HTTPS: 'true'};
      const configTrue = generateConfig(mockParams, envWithHttpsTrue);
      expect(configTrue.ENFORCE_HTTPS).toBe(true);

      const envWithHttpsFalse = {...mockEnv, ENFORCE_HTTPS: 'false'};
      const configFalse = generateConfig(mockParams, envWithHttpsFalse);
      expect(configFalse.ENFORCE_HTTPS).toBe(false);
    });

    it('should configure Open Graph metadata', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.OPEN_GRAPH).toBeDefined();
      expect(config.OPEN_GRAPH.TITLE).toBe('Wire');
      expect(config.OPEN_GRAPH.DESCRIPTION).toBe('Wire secure messenger');
      expect(config.OPEN_GRAPH.IMAGE_URL).toBe('https://wire.com/image.png');
    });

    it('should set DEVELOPMENT flag correctly', () => {
      const prodConfig = generateConfig(mockParams, mockEnv);
      expect(prodConfig.DEVELOPMENT).toBe(false);

      const devParams: ConfigGeneratorParams = {
        ...mockParams,
        env: 'development',
      };
      const devConfig = generateConfig(devParams, mockEnv);
      expect(devConfig.DEVELOPMENT).toBe(true);
    });

    it('should detect TLS from HTTPS URLs', () => {
      const httpsParams: ConfigGeneratorParams = {
        ...mockParams,
        urls: {
          base: 'https://local.zinfra.io:8081',
          api: 'https://staging-nginz-https.zinfra.io',
          ws: 'wss://staging-nginz-ssl.zinfra.io',
        },
      };
      const httpsConfig = generateConfig(httpsParams, mockEnv);
      expect(httpsConfig.DEVELOPMENT_ENABLE_TLS).toBe(true);

      const httpParams: ConfigGeneratorParams = {
        ...mockParams,
        urls: {
          base: 'http://localhost:8081',
          api: 'http://localhost:8080',
          ws: 'ws://localhost:8080',
        },
      };
      const httpConfig = generateConfig(httpParams, mockEnv);
      expect(httpConfig.DEVELOPMENT_ENABLE_TLS).toBe(false);
    });

    it('should set cache duration', () => {
      const config = generateConfig(mockParams, mockEnv);
      expect(config.CACHE_DURATION_SECONDS).toBe(300);
    });

    it('should configure robots settings', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.ROBOTS).toBeDefined();
      expect(config.ROBOTS.ALLOWED_HOSTS).toEqual(['app.wire.com']);
      expect(config.ROBOTS.ALLOW).toBeDefined();
      expect(config.ROBOTS.DISALLOW).toBeDefined();
    });

    it('should include GOOGLE_WEBMASTER_ID', () => {
      const config = generateConfig(mockParams, mockEnv);
      expect(config.GOOGLE_WEBMASTER_ID).toBe('test-google-id');
    });

    it('should handle ENABLE_DYNAMIC_HOSTNAME flag', () => {
      const envWithDynamicHostname = {...mockEnv, ENABLE_DYNAMIC_HOSTNAME: 'true'};
      const config = generateConfig(mockParams, envWithDynamicHostname);
      expect(config.ENABLE_DYNAMIC_HOSTNAME).toBe(true);

      const envWithoutDynamicHostname = {...mockEnv, ENABLE_DYNAMIC_HOSTNAME: 'false'};
      const configFalse = generateConfig(mockParams, envWithoutDynamicHostname);
      expect(configFalse.ENABLE_DYNAMIC_HOSTNAME).toBe(false);
    });

    describe('Content Security Policy (CSP)', () => {
      it('should generate default CSP', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.CSP).toBeDefined();
        expect(config.CSP.connectSrc).toContain("'self'");
        expect(config.CSP.connectSrc).toContain('https://prod-nginz-https.wire.com');
        expect(config.CSP.connectSrc).toContain('wss://prod-nginz-ssl.wire.com');
      });

      it('should include backend URLs in CSP connect-src', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.CSP.connectSrc).toContain(mockParams.urls.api);
        expect(config.CSP.connectSrc).toContain(mockParams.urls.ws);
      });

      it('should merge extra CSP entries', () => {
        const envWithExtraCSP = {
          ...mockEnv,
          CSP_EXTRA_CONNECT_SRC: 'https://example.com, https://api.example.com',
          CSP_EXTRA_IMG_SRC: 'https://cdn.example.com',
          CSP_EXTRA_SCRIPT_SRC: 'https://scripts.example.com',
        };

        const config = generateConfig(mockParams, envWithExtraCSP);

        expect(config.CSP.connectSrc).toContain('https://example.com');
        expect(config.CSP.connectSrc).toContain('https://api.example.com');
        expect(config.CSP.imgSrc).toContain('https://cdn.example.com');
        expect(config.CSP.scriptSrc).toContain('https://scripts.example.com');
      });

      it('should allow all connections in debug mode', () => {
        const envWithDebug = {
          ...mockEnv,
          FEATURE_ENABLE_DEBUG: 'true',
        };

        const config = generateConfig(mockParams, envWithDebug);

        expect(config.CSP.connectSrc).toContain('*');
      });

      it('should not allow all connections in production mode', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.CSP.connectSrc).not.toContain('*');
      });

      it('should handle CSP_EXTRA_OBJECT_SRC with default none', () => {
        const config = generateConfig(mockParams, mockEnv);
        expect(config.CSP.objectSrc).toEqual(["'none'"]);

        const envWithObjectSrc = {
          ...mockEnv,
          CSP_EXTRA_OBJECT_SRC: 'https://objects.example.com',
        };
        const configWithObjects = generateConfig(mockParams, envWithObjectSrc);
        expect(configWithObjects.CSP.objectSrc).toEqual(['https://objects.example.com']);
      });

      it('should include Giphy domains in CSP', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.CSP.connectSrc).toContain('https://*.giphy.com');
        expect(config.CSP.imgSrc).toContain('https://*.giphy.com');
      });

      it('should include media embed domains in frame-src', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.CSP.frameSrc).toContain('https://*.soundcloud.com');
        expect(config.CSP.frameSrc).toContain('https://*.spotify.com');
        expect(config.CSP.frameSrc).toContain('https://*.vimeo.com');
        expect(config.CSP.frameSrc).toContain('https://*.youtube-nocookie.com');
      });

      it('should filter out empty CSP values', () => {
        const config = generateConfig(mockParams, mockEnv);

        Object.values(config.CSP).forEach(value => {
          const array = Array.from(value as Iterable<string>);
          expect(array.every(item => item.length > 0)).toBe(true);
        });
      });
    });

    describe('SSL Certificate Paths', () => {
      it('should set SSL certificate paths', () => {
        const config = generateConfig(mockParams, mockEnv);

        expect(config.SSL_CERTIFICATE_KEY_PATH).toBeDefined();
        expect(config.SSL_CERTIFICATE_PATH).toBeDefined();
        expect(typeof config.SSL_CERTIFICATE_KEY_PATH).toBe('string');
        expect(typeof config.SSL_CERTIFICATE_PATH).toBe('string');
      });

      it('should use environment variable paths when provided', () => {
        const envWithCustomPaths = {
          ...mockEnv,
          SSL_CERTIFICATE_KEY_PATH: '/custom/path/key.pem',
          SSL_CERTIFICATE_PATH: '/custom/path/cert.pem',
        };

        const config = generateConfig(mockParams, envWithCustomPaths);

        expect(config.SSL_CERTIFICATE_KEY_PATH).toBe('/custom/path/key.pem');
        expect(config.SSL_CERTIFICATE_PATH).toBe('/custom/path/cert.pem');
      });
    });
  });
});
