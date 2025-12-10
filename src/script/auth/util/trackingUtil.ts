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

import * as telemetry from '@wireapp/telemetry';

import {Config} from 'src/script/Config';
import {createUuid} from 'Util/uuid';

let telemetryInitialized = false;

const REPORTING_DEVICE_ID = 'REPORTING_DEVICE_ID';

const getDeviceId = () => {
  let deviceId = window.localStorage.getItem(REPORTING_DEVICE_ID);
  if (!deviceId) {
    deviceId = createUuid();
    window.localStorage.setItem(REPORTING_DEVICE_ID, deviceId);
  }
  return deviceId;
};

export enum Segmentation {
  APP_VERSION = 'app_version',
  OS_VERSION = 'os_version',
  MULTIPLE_PASSWORD_TRIES = 'multiple_password_tries',
}

interface SegmentationRecord {
  [key: string]: string | boolean;
}
export enum EventName {
  ACCOUNT_SETUP_SCREEN_1 = 'account_setup_screen_1',
}

export enum PageView {
  ACCOUNT_VERIFICATION_SCREEN_2 = 'account_verification_screen_2',
  ACCOUNT_VERIFICATION_FAILED_SCREEN_2_5 = 'account_verification_failed_screen_2_5',
  ACCOUNT_USERNAME_SCREEN_3 = 'account_username_screen_3',
  ACCOUNT_COMPLETION_SCREEN_4 = 'account_completion_screen_4',
}

export const isTelemetryEnabled = () => {
  const {COUNTLY_ENABLE_LOGGING, COUNTLY_API_KEY} = Config.getConfig();

  if (!COUNTLY_ENABLE_LOGGING || !COUNTLY_API_KEY || !telemetry.isLoaded()) {
    return false;
  }

  return true;
};

export const initializeTelemetry = () => {
  const {VERSION, COUNTLY_API_KEY, COUNTLY_SERVER_URL} = Config.getConfig();

  if (!isTelemetryEnabled()) {
    return;
  }

  telemetry.initialize({
    appVersion: VERSION,
    provider: {
      apiKey: COUNTLY_API_KEY,
      serverUrl: COUNTLY_SERVER_URL,
      enableLogging: false,
      autoClickTracking: true,
      autoErrorTracking: false,
      autoPageViewTracking: false,
    },
  });

  telemetryInitialized = true;
  telemetry.addAllConsentFeatures();
  telemetry.changeDeviceId(getDeviceId());
  telemetry.disableOfflineMode(getDeviceId());
  telemetry.beginSession();

  window.addEventListener('beforeunload', () => {
    telemetry.endSession();
  });
};

export const trackTelemetryEvent = (eventName: EventName, segmentation?: SegmentationRecord) => {
  const {VERSION} = Config.getConfig();

  if (!telemetryInitialized) {
    return;
  }

  const telemetryEvent: telemetry.TelemetryEvent = {
    name: eventName,
    segmentation: {
      ...segmentation,
      [Segmentation.APP_VERSION]: VERSION,
      [Segmentation.OS_VERSION]: navigator.userAgent,
    },
  };

  telemetry.trackEvent(telemetryEvent);
};

export const trackTelemetryPageView = (pageView: PageView) => {
  if (!telemetryInitialized) {
    return;
  }

  telemetry.trackPageView(pageView);
};

export const resetTelemetrySession = () => {
  window.localStorage.removeItem(REPORTING_DEVICE_ID);
  telemetryInitialized = false;
  telemetry.endSession();
};
