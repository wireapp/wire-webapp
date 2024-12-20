/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Countly, type CountlyConsentFeatures} from './countly';

declare global {
  interface Window {
    Countly: Countly;
  }
}

type TelemetryConsentFeatures = CountlyConsentFeatures;

const allConsentFeatures: TelemetryConsentFeatures[] = [
  'sessions',
  'events',
  'views',
  'scrolls',
  'clicks',
  'forms',
  'crashes',
  'attribution',
  'users',
  'star-rating',
  'feedback',
  'location',
  'remote-config',
  'apm',
];

export type TelemetryEvent<SegmentationType = string | number | boolean> = {
  /**
   * The name of the event
   */
  name: string;
  /**
   * The number of events to be send
   * @default 1
   */
  count?: number;
  /**
   * The sum to report with the event
   */
  sum?: number;
  /**
   * The duration expressed in seconds, meant for reporting with the event
   */
  duration?: number;
  /**
   * The an object with key/value pairs to report with the event as segments
   */
  segmentation?: Record<string, SegmentationType>;
};

/**
 * Configuration options for initializing the analytics library.
 */
interface InitializeConfig {
  /**
   * The version of the application.
   */
  appVersion: string;
  provider: {
    /**
     * The URL of the analytics provider server.
     */
    serverUrl: string;
    /**
     * The API key for the analytics provider.
     */
    apiKey: string;
    /**
     * Whether to automatically track user sessions (default: true).
     * @default true
     */
    autoSessionTracking?: boolean;
    /**
     * Whether to automatically track page views (default: true).
     * @default true
     */
    autoPageViewTracking?: boolean;
    /**
     * Whether to automatically track user clicks
     *  @default false
     */
    autoClickTracking?: boolean;
    /**
     * Whether to automatically track user scrolls
     *  @default false
     */
    autoScrollTracking?: boolean;
    /**
     * Whether to automatically track application errors
     *  @default false
     */
    autoErrorTracking?: boolean;
    /**
     * Whether to automatically track link clicks
     *  @default false
     */
    autoLinksTracking?: boolean;
    /**
     * Whether to enable logging for debugging purposes
     * @default false
     */
    enableLogging?: boolean;
    /**
     * Whether to track orientation (landscape/portrait)
     * @default false
     */
    enableOrientationTracking?: boolean;
    /**
     * Whether to require user consent before tracking data
     * @default true
     */
    requireConsent?: boolean;
    /**
     * Whether to use cookies to track sessions
     * @default false
     */
    useSessionCookie?: boolean;
    /**
     * Specifies the type of storage to use.
     *
     * By default, it uses local storage and falls back to cookies if local storage is unavailable.
     * You can set the value to "localstorage" or "cookies" to force the use of a specific storage type,
     * or use "none" to avoid using any storage and keep everything in memory.
     * @default 'localstorage'
     */
    storage?: 'localstorage' | 'cookies' | 'none';
    /**
     * Whether to enable offline mode.
     *
     * In offline mode, data is collected but not sent to the server until offline mode is disabled.
     * If consent was enabled, it must be reestablished after enabling offline mode.
     *
     * @default true
     */
    offline_mode?: boolean;
  };
}

/**
 * Initializes the analytics library with the provided configuration.
 * @param {InitilaizeConfig} config - The configuration options.
 */
export const initialize = (config: InitializeConfig): void => {
  if (!isLoaded()) {
    console.error('Telemetry script not loaded');
    return;
  }

  window.Countly.app_version = config.appVersion;
  window.Countly.app_key = config.provider.apiKey;
  window.Countly.debug = config.provider.enableLogging ?? false;
  window.Countly.url = config.provider.serverUrl;
  window.Countly.offline_mode = config.provider.offline_mode ?? true;
  window.Countly.use_session_cookie = config.provider.useSessionCookie ?? false;
  window.Countly.storage = config.provider.storage ?? 'localstorage';
  window.Countly.require_consent = config.provider.requireConsent ?? true;
  window.Countly.enable_orientation_tracking = config.provider.enableOrientationTracking ?? false;

  if (config.provider.autoSessionTracking) {
    window.Countly.q.push(['track_sessions']);
  }

  if (config.provider.autoPageViewTracking) {
    window.Countly.q.push(['track_pageview']);
  }

  if (config.provider.autoClickTracking) {
    window.Countly.q.push(['track_clicks']);
  }

  if (config.provider.autoScrollTracking) {
    window.Countly.q.push(['track_scrolls']);
  }

  if (config.provider.autoLinksTracking) {
    window.Countly.q.push(['track_links']);
  }

  if (config.provider.autoErrorTracking) {
    window.Countly.q.push(['track_errors']);
  }

  window.Countly.init();
};

/**
 * Checks if the analytics provider has been successfully loaded and is available for use.
 */
export const isLoaded = (): boolean => {
  const loaded = !!window.Countly && !!window.Countly.q;
  if (!loaded) {
    console.warn('Countly is not available');
  }
  return loaded;
};

/**
 * Sets user data in the analytics provider.
 * @param {Record<string, Value>} userData - An object where the keys are the user data properties and the values are the corresponding data.
 * @template Value - The type of the user data values (string, number, or boolean).
 */
export const setUserData = <Value = string | number | boolean>(userData: Record<string, Value>): void => {
  Object.entries(userData).forEach(entry => {
    const [key, value] = entry;
    window.Countly.q.push(['userData.set', key, value]);
  });

  window.Countly.q.push(['userData.save']);
};

/**
 * Manually starts a new user session
 */
export const beginSession = (): void => {
  window.Countly.q.push(['begin_session']);
};

/**
 * Manually ends the current user session
 */
export const endSession = (): void => {
  window.Countly.q.push(['end_session']);
};

/**
 * Tracks a custom event.
 *
 * Events are a way to track any custom actions or other data you would like to track from your website.
 * You may also set segments to view a breakdown of the action by providing the segment values.
 *
 */
export const trackEvent = <SegmentationType = string | number | boolean>({
  name,
  count,
  sum,
  duration,
  segmentation,
}: TelemetryEvent<SegmentationType>): void => {
  window.Countly.q.push(['add_event', {key: name, count, sum, dur: duration, segmentation}]);
};

/**
 * Automatically track clicks on the last reported view and display them on the heatmap.
 */
export const trackClicks = (): void => {
  window.Countly.q.push(['track_clicks']);
};

/**
 * Tracks a page view.
 *
 * This method will track the current page view by using location.path as the page name and then reporting it to the server.
 * For single-page applications, pass the page name as a parameter to record the new page view.
 *
 * @param {string} location - The URL or location of the page view.
 */
export const trackPageView = (location?: string): void => {
  window.Countly.q.push(['track_pageview', location]);
};

/**
 * Adds all available consent features to the analytics library.
 *
 * Use this to inform provider of the all features the user has consented to.
 */
export const addAllConsentFeatures = (): void => {
  window.Countly.q.push(['add_consent', allConsentFeatures]);
};

/**
 * Removes all available consent features from the analytics library.
 *
 * Use this to inform provider of the all features the user has withdrawn consent for.
 *
 */
export const removeAllConsentFeatures = (): void => {
  window.Countly.q.push(['remove_consent', allConsentFeatures]);
};

/**
 * Adds consent features to the analytics library.
 *
 * Use this to inform provider of the features the user has consented to.
 *
 * @param {TelemetryConsentFeatures[]} features - An array of consent features to add.
 */
export const addConsentFeatures = (features: TelemetryConsentFeatures[]): void => {
  window.Countly.q.push(['add_consent', features]);
};

/**
 * Removes consent features from the analytics library.
 *
 * Use this to inform provider of the features the user has withdrawn consent for.
 *
 * @param {TelemetryConsentFeatures[]} features - An array of consent features to remove.
 */
export const removeConsentFeatures = (features: TelemetryConsentFeatures[]): void => {
  window.Countly.q.push(['remove_consent', features]);
};

/**
 * Changes the device ID in the analytics library.
 *
 * If the device ID is changed without merging and consent was enabled, all previously given consent will be removed.
 * To merge data of both user IDs, pass `true` as the third parameter.
 *
 * @param {string} newDeviceId - The new device ID to use.
 * @param {boolean} [merge=false] - Whether to merge data of both user IDs.
 */
export const changeDeviceId = (newDeviceId: string, merge: boolean = false): void => {
  window.Countly.q.push(['change_id', newDeviceId, merge]);
};

/**
 * Disables offline mode for a specific device.
 *
 * When offline mode is disabled, data collected while offline is sent to the server.
 * If consent was enabled, it must be reestablished after disabling offline mode.
 *
 * @param {string} deviceId - The device ID for which to disable offline mode.
 */
export const disableOfflineMode = (deviceId: string): void => {
  window.Countly.q.push(['disable_offline_mode', deviceId]);
};

/**
 * Enables offline mode.
 *
 * In offline mode, data is collected but not sent to the server until offline mode is disabled.
 * If consent was enabled, it must be reestablished after enabling offline mode.
 */
export const enableOfflineMode = (): void => {
  window.Countly.q.push(['enable_offline_mode']);
};

/**
 * Returns the underlying analytics provider instance, which provides access to the full analytics library API.
 * @returns {AnalyticsProvider} - The analytics provider instance.
 */
export const getProviderInstance = (): Countly => {
  return window.Countly;
};

export {CountlyConsentFeatures as TelemetryConsentFeatures};
