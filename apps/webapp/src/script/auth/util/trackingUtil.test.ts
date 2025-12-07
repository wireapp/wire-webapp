/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

jest.mock('@wireapp/telemetry');
jest.mock('src/script/Config');
jest.mock('Util/uuid');

import {Config} from 'src/script/Config';
import {createUuid} from 'Util/uuid';

import * as telemetry from '@wireapp/telemetry';

import * as trackingUtil from './trackingUtil';

const REPORTING_DEVICE_ID = 'REPORTING_DEVICE_ID';
const MOCK_UUID = 'mock-uuid';
const MOCK_USER_AGENT = 'test-user-agent';
const CONFIG_DEFAULTS = {
  COUNTLY_ENABLE_LOGGING: true,
  VERSION: '1.2.3',
  COUNTLY_API_KEY: 'api-key',
  COUNTLY_SERVER_URL: 'https://server.url',
};

describe('trackingUtil', () => {
  const ORIGINAL_LOCAL_STORAGE = global.localStorage;

  let localStorageMock: any;
  const configFactory = (overrides = {}) => ({
    ...CONFIG_DEFAULTS,
    ...overrides,
  });

  beforeEach(() => {
    localStorageMock = (() => {
      let store: Record<string, string> = {};
      return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
      };
    })();
    Object.defineProperty(window, 'localStorage', {value: localStorageMock, configurable: true});
    (telemetry.isLoaded as jest.Mock).mockReturnValue(true);
    (createUuid as jest.Mock).mockReturnValue(MOCK_UUID);
    jest.spyOn(window, 'addEventListener').mockImplementation(jest.fn());
    jest.spyOn(navigator, 'userAgent', 'get').mockReturnValue(MOCK_USER_AGENT);
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {value: ORIGINAL_LOCAL_STORAGE, configurable: true});
    jest.restoreAllMocks();
  });

  describe('initializeTelemetry', () => {
    it('should initialize telemetry and set device id if not present', () => {
      (Config.getConfig as jest.Mock).mockReturnValue(configFactory());
      localStorageMock.getItem.mockReturnValueOnce(null);
      trackingUtil.initializeTelemetry();
      expect(telemetry.initialize).toHaveBeenCalledWith(
        expect.objectContaining({
          appVersion: CONFIG_DEFAULTS.VERSION,
          provider: expect.objectContaining({
            apiKey: CONFIG_DEFAULTS.COUNTLY_API_KEY,
            serverUrl: CONFIG_DEFAULTS.COUNTLY_SERVER_URL,
          }),
        }),
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(REPORTING_DEVICE_ID, MOCK_UUID);
      expect(telemetry.addAllConsentFeatures).toHaveBeenCalled();
      expect(telemetry.changeDeviceId).toHaveBeenCalledWith(MOCK_UUID);
      expect(telemetry.disableOfflineMode).toHaveBeenCalledWith(MOCK_UUID);
      expect(telemetry.beginSession).toHaveBeenCalled();
      expect(window.addEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should not initialize telemetry if COUNTLY_ENABLE_LOGGING is false', async () => {
      (Config.getConfig as jest.Mock).mockReturnValue(configFactory({COUNTLY_ENABLE_LOGGING: false}));
      trackingUtil.initializeTelemetry();
      expect(telemetry.initialize).not.toHaveBeenCalled();
    });

    it('should not initialize telemetry if COUNTLY_API_KEY is missing', () => {
      (Config.getConfig as jest.Mock).mockReturnValue(configFactory({COUNTLY_API_KEY: ''}));
      trackingUtil.initializeTelemetry();
      expect(telemetry.initialize).not.toHaveBeenCalled();
    });

    it('should not initialize telemetry if telemetry is not loaded', () => {
      (Config.getConfig as jest.Mock).mockReturnValueOnce(configFactory());
      (telemetry.isLoaded as jest.Mock).mockReturnValueOnce(false);
      trackingUtil.initializeTelemetry();
      expect(telemetry.initialize).not.toHaveBeenCalled();
    });
  });

  describe('trackTelemetryEvent', () => {
    beforeEach(() => {
      (Config.getConfig as jest.Mock).mockReturnValue(configFactory());
      // Ensure telemetry is initialized
      trackingUtil.initializeTelemetry();
      jest.clearAllMocks();
    });

    it('should track event with segmentation', () => {
      trackingUtil.trackTelemetryEvent(trackingUtil.EventName.ACCOUNT_SETUP_SCREEN_1, {
        [trackingUtil.Segmentation.MULTIPLE_PASSWORD_TRIES]: true,
      });
      expect(telemetry.trackEvent).toHaveBeenCalledWith({
        name: trackingUtil.EventName.ACCOUNT_SETUP_SCREEN_1,
        segmentation: expect.objectContaining({
          [trackingUtil.Segmentation.APP_VERSION]: CONFIG_DEFAULTS.VERSION,
          [trackingUtil.Segmentation.OS_VERSION]: MOCK_USER_AGENT,
          [trackingUtil.Segmentation.MULTIPLE_PASSWORD_TRIES]: true,
        }),
      });
    });

    it('should not track event if telemetry is not initialized', () => {
      // Simulate not initialized
      trackingUtil.resetTelemetrySession();
      jest.clearAllMocks();
      trackingUtil.trackTelemetryEvent(trackingUtil.EventName.ACCOUNT_SETUP_SCREEN_1);
      expect(telemetry.trackEvent).not.toHaveBeenCalled();
    });
  });

  describe('trackTelemetryPageView', () => {
    beforeEach(() => {
      (Config.getConfig as jest.Mock).mockReturnValueOnce(configFactory());
      trackingUtil.initializeTelemetry();
      jest.clearAllMocks();
    });

    it('should track page view if telemetry is initialized', () => {
      trackingUtil.trackTelemetryPageView(trackingUtil.PageView.ACCOUNT_COMPLETION_SCREEN_4);
      expect(telemetry.trackPageView).toHaveBeenCalledWith(trackingUtil.PageView.ACCOUNT_COMPLETION_SCREEN_4);
    });

    it('should not track page view if telemetry is not initialized', () => {
      trackingUtil.resetTelemetrySession();
      jest.clearAllMocks();
      trackingUtil.trackTelemetryPageView(trackingUtil.PageView.ACCOUNT_COMPLETION_SCREEN_4);
      expect(telemetry.trackPageView).not.toHaveBeenCalled();
    });
  });
});
