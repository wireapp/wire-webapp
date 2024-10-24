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

import {Segmentation} from './Segmentation';

import type {ContributedSegmentations} from '../conversation/MessageRepository';

type Keys = keyof typeof Segmentation;
type Values = (typeof Segmentation)[Keys];

export interface UserData {
  set_once: (keyValues: {[key: string]: any}) => void;
  set: (key: string, value: any) => void;
  increment: (key: string) => void;
  incrementBy: (key: string, value: number) => void;
  save: () => void;
}

export interface CountlyEvent {
  key: string;
  count?: number;
  sum?: number;
  dur?: number;
  segmentation?: ContributedSegmentations | Values;
}

/**
 * Countly is a global object provided by the countly.min.js script
 * @see https://support.countly.com/hc/en-us/articles/360037441932-Web-analytics-JavaScript
 * Current types are based on the documentation from the link above on 2024-09-05
 */
export interface Countly {
  /**
   * Countly does not provide Typescript types, so we have to define the q array as any[].
   * The documentation for everything than can be pushed to q is here is linked above.
   */
  q: any[];
  //  mandatory, app key for your app created in Countly
  app_key: string;
  // to identify a visitor, will be autogenerated if not provided
  device_id: string;
  // your Countly server URL - you may also use your own server URL or IP here
  url: string;
  // (optional) the version of your app or website
  app_version?: string;
  // (optional) country code for your visitor
  country_code?: string;
  // (optional) city for your visitor
  city?: string;
  // (optional) ip_address for your visitor
  ip_address?: string;
  // output debug info into the console (default: false)
  debug: boolean;
  // option to ignore traffic from bots (default: true)
  ignore_bots: boolean;
  // set an interval for how often inspections should be made to see if there is any data to report and then report it (default: 500 ms)
  interval: number;
  // the maximum amount of queued requests to store (default: 1000)
  queue_size: number;
  // set the time to wait in seconds after a failed connection to the server (default: 60 seconds)
  fail_timeout: number;
  // the time limit after which a user will be considered inactive if no actions have been made. No mouse movement, scrolling, or keys pressed. Expressed in minutes (default: 20 minutes)
  inactivity_time: number;
  // how often a session should be extended, expressed in seconds (default: 60 seconds)
  session_update: number;
  // maximum amount of events to send in one batch (default: 100)
  max_events: number;
  // the maximum amount of breadcrumbs to store for crash logs (default: 100)
  max_breadcrumb_count: number;
  // array with referrers to ignore (default: none)
  ignore_referrers: string[];
  // string salt for checksums (default: none)
  checksum_salt: string;
  // ignore prefetching and pre-rendering from counting as real website visits (default: true)
  ignore_prefetch: boolean;
  // Array of trusted domains (as string) that can trigger heatmap script loading. By default the SDK whitelists your server url.
  heatmap_whitelist: string[];
  // force using post method for all requests (default: false)
  force_post: boolean;
  // ignore this current visitor (default: false)
  ignore_visitor: boolean;
  // Pass true if you are implementing GDPR compatible consent management. This would prevent running any functionality without proper consent (default: false)
  require_consent: boolean;
  // object instructing which UTM parameters to track (default: {"source":true, "medium":true, "campaign":true, "term":true, "content":true})
  utm: {[key: string]: boolean};
  // use cookies to track sessions (default: true)
  use_session_cookie: boolean;
  // how long until a cookie session should expire, expressed in minutes (default: 30 minutes)
  session_cookie_timeout: number;
  // enable automatic remote config fetching, provide the callback function to be notified when fetching is complete (default: false)
  remote_config: boolean;
  // opts in the user for A/B testing while fetching the remote config (default: true)
  rc_automatic_optin_for_ab: boolean;
  // set it to true to use the explicit remote config API (default: false)
  use_explicit_rc_api: boolean;
  // have a separate namespace for persistent data when using multiple trackers on the same domain
  namespace: string;
  // Set to false to disable domain tracking, so no domain data would be reported (default: true)
  track_domains: boolean;
  // object to override or add headers to all SDK requests
  headers: {[key: string]: string};
  // What type of storage to use, by default uses local storage and would fallback to cookies, but you can set values "localstorage" or "cookies" to force only specific storage, or use "none" to not use any storage and keep everything in memory
  storage: 'localstorage' | 'cookies' | 'none';
  /**
   * provide metrics override or custom metrics for this user.
   * For more information on the specific metric keys used by Countly, check:
   * https://support.countly.com/hc/en-us/articles/9290669873305-A-Deeper-Look-at-SDK-concepts#setting-custom-user-metrics
   */
  metrics: {[key: string]: any};
  // initialize Countly tracking after setting the configuration
  init: () => void;
}

declare global {
  interface Window {
    // Countly is a global object provided by the countly.min.js script
    Countly: Countly;
  }
}
