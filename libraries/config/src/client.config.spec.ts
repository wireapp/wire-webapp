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

import {generateConfig} from './client.config';
import {ConfigGeneratorParams} from './config.types';
import {Env} from './env';

describe('Client Config', () => {
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

  const mockEnv: Partial<Env> = {
    NODE_ENV: 'production',
    PORT: '8081',
    NODE_DEBUG: '@wireapp/*',
    ANALYTICS_API_KEY: 'test-api-key',
    APP_BASE: 'https://app.wire.com',
    APP_NAME: 'Wire',
    BACKEND_NAME: 'Wire',
    WEBSITE_LABEL: 'wire.com',
    BACKEND_REST: 'https://prod-nginz-https.wire.com',
    BACKEND_WS: 'wss://prod-nginz-ssl.wire.com',
    BRAND_NAME: 'Wire',
    ENFORCE_HTTPS: 'true',
    FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS: '*',
    FEATURE_CHECK_CONSENT: 'true',
    FEATURE_ENABLE_DEBUG: 'false',
    FEATURE_ENABLE_SSO: 'true',
    FEATURE_ENABLE_ACCOUNT_REGISTRATION: 'true',
    FEATURE_ENABLE_MEDIA_EMBEDS: 'true',
    MAX_GROUP_PARTICIPANTS: '500',
    MAX_VIDEO_PARTICIPANTS: '4',
    NEW_PASSWORD_MINIMUM_LENGTH: '8',
    URL_ACCOUNT_BASE: 'https://account.wire.com',
    URL_WEBSITE_BASE: 'https://wire.com',
    GOOGLE_WEBMASTER_ID: '',
    COUNTLY_API_KEY: '',
    COUNTLY_ENABLE_LOGGING: 'false',
    COUNTLY_FORCE_REPORTING: 'false',
    OPEN_GRAPH_DESCRIPTION: '',
    OPEN_GRAPH_IMAGE_URL: '',
    OPEN_GRAPH_TITLE: '',
  } as Env;

  describe('generateConfig', () => {
    it('should generate a valid client config', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config).toBeDefined();
      expect(config.VERSION).toBe('1.0.0');
      expect(config.ENVIRONMENT).toBe('production');
      expect(config.APP_NAME).toBe('Wire');
      expect(config.BRAND_NAME).toBe('Wire');
    });

    it('should map URL parameters correctly', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.APP_BASE).toBe('https://app.wire.com');
      expect(config.BACKEND_REST).toBe('https://prod-nginz-https.wire.com');
      expect(config.BACKEND_WS).toBe('wss://prod-nginz-ssl.wire.com');
    });

    it('should handle empty URLs with fallback', () => {
      const paramsWithoutUrls: ConfigGeneratorParams = {
        ...mockParams,
        urls: {},
      };

      const config = generateConfig(paramsWithoutUrls, mockEnv);

      expect(config.APP_BASE).toBe('');
      expect(config.BACKEND_REST).toBe('');
      expect(config.BACKEND_WS).toBe('');
    });

    it('should parse boolean feature flags correctly', () => {
      const envWithFeatures: Partial<Env> = {
        ...mockEnv,
        FEATURE_ENABLE_DEBUG: 'true',
        FEATURE_ENABLE_SSO: 'false',
        FEATURE_CHECK_CONSENT: 'true',
      } as Env;

      const config = generateConfig(mockParams, envWithFeatures);

      expect(config.FEATURE.ENABLE_DEBUG).toBe(true);
      expect(config.FEATURE.ENABLE_SSO).toBe(false);
      expect(config.FEATURE.CHECK_CONSENT).toBe(true);
    });

    it('should handle default values for boolean flags', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.FEATURE.ENABLE_ACCOUNT_REGISTRATION).toBe(true);
      expect(config.FEATURE.ENABLE_MEDIA_EMBEDS).toBe(true);
      expect(config.FEATURE.CHECK_CONSENT).toBe(true);
    });

    it('should parse numeric values correctly', () => {
      const envWithNumbers: Partial<Env> = {
        ...mockEnv,
        MAX_GROUP_PARTICIPANTS: '1000',
        MAX_VIDEO_PARTICIPANTS: '8',
        NEW_PASSWORD_MINIMUM_LENGTH: '12',
        MAX_API_VERSION: '5',
      } as Env;

      const config = generateConfig(mockParams, envWithNumbers);

      expect(config.MAX_GROUP_PARTICIPANTS).toBe(1000);
      expect(config.MAX_VIDEO_PARTICIPANTS).toBe(8);
      expect(config.NEW_PASSWORD_MINIMUM_LENGTH).toBe(12);
      expect(config.MAX_API_VERSION).toBe(5);
    });

    it('should use default values for missing numeric values', () => {
      const envWithoutNumbers: Partial<Env> = {
        ...mockEnv,
        MAX_GROUP_PARTICIPANTS: '',
        MAX_VIDEO_PARTICIPANTS: '',
        NEW_PASSWORD_MINIMUM_LENGTH: '',
      } as Env;

      const config = generateConfig(mockParams, envWithoutNumbers);

      expect(config.MAX_GROUP_PARTICIPANTS).toBe(500);
      expect(config.MAX_VIDEO_PARTICIPANTS).toBe(4);
      expect(config.NEW_PASSWORD_MINIMUM_LENGTH).toBe(8);
      expect(config.MAX_API_VERSION).toBe(13);
    });

    it('should parse file upload extensions correctly', () => {
      const envWithExtensions: Partial<Env> = {
        ...mockEnv,
        FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS: '.jpg, .png, .pdf',
      } as Env;

      const config = generateConfig(mockParams, envWithExtensions);

      expect(config.FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS).toEqual(['.jpg', '.png', '.pdf']);
    });

    it('should default to all extensions when not specified', () => {
      const envWithAllExtensions: Partial<Env> = {
        ...mockEnv,
        FEATURE_ALLOWED_FILE_UPLOAD_EXTENSIONS: '*',
      } as Env;

      const config = generateConfig(mockParams, envWithAllExtensions);

      expect(config.FEATURE.ALLOWED_FILE_UPLOAD_EXTENSIONS).toEqual(['*']);
    });

    it('should include URL configuration object', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.URL).toBeDefined();
      expect(config.URL.ACCOUNT_BASE).toBe('https://account.wire.com');
      expect(config.URL.WEBSITE_BASE).toBe('https://wire.com');
    });

    it('should handle COUNTLY configuration', () => {
      const envWithCountly: Partial<Env> = {
        ...mockEnv,
        COUNTLY_API_KEY: 'test-key',
        COUNTLY_ENABLE_LOGGING: 'true',
        COUNTLY_FORCE_REPORTING: 'true',
        COUNTLY_ALLOWED_BACKEND: 'https://nginz-https.wire.com',
      } as Env;

      const config = generateConfig(mockParams, envWithCountly);

      expect(config.COUNTLY_API_KEY).toBe('test-key');
      expect(config.COUNTLY_ENABLE_LOGGING).toBe(true);
      expect(config.COUNTLY_FORCE_REPORTING).toBe(true);
      expect(config.COUNTLY_ALLOWED_BACKEND).toBe('https://nginz-https.wire.com');
    });

    it('should handle optional APPLOCK timeout configuration', () => {
      const envWithAppLock: Partial<Env> = {
        ...mockEnv,
        FEATURE_APPLOCK_SCHEDULED_TIMEOUT: '300',
      } as Env;

      const config = generateConfig(mockParams, envWithAppLock);

      expect(config.FEATURE.APPLOCK_SCHEDULED_TIMEOUT).toBe(300);
    });

    it('should return null for APPLOCK timeout when not set', () => {
      const config = generateConfig(mockParams, mockEnv);

      expect(config.FEATURE.APPLOCK_SCHEDULED_TIMEOUT).toBeNull();
    });

    it('should handle DataDog configuration', () => {
      const envWithDataDog: Partial<Env> = {
        ...mockEnv,
        DATADOG_APPLICATION_ID: 'app-id',
        DATADOG_CLIENT_TOKEN: 'client-token',
        FEATURE_DATADOG_ENVIRONMENT: 'staging',
      } as Env;

      const config = generateConfig(mockParams, envWithDataDog);

      expect(config.DATADOG_APPLICATION_ID).toBe('app-id');
      expect(config.DATADOG_CLIENT_TOKEN).toBe('client-token');
      expect(config.FEATURE.DATADOG_ENVIRONMENT).toBe('staging');
    });

    it('should handle development environment correctly', () => {
      const devParams: ConfigGeneratorParams = {
        ...mockParams,
        env: 'development',
      };

      const config = generateConfig(devParams, mockEnv);

      expect(config.ENVIRONMENT).toBe('development');
    });

    it('should handle ENABLE_DEV_BACKEND_API flag', () => {
      const envWithDevApi: Partial<Env> = {
        ...mockEnv,
        ENABLE_DEV_BACKEND_API: 'true',
      } as Env;

      const config = generateConfig(mockParams, envWithDevApi);

      expect(config.ENABLE_DEV_BACKEND_API).toBe(true);
    });
  });
});
