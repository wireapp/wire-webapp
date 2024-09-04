/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

export interface Countly {
  q: any[];

  init: (config: any) => Countly;
  debug: boolean;

  opt_out: () => void;
  opt_in: () => void;

  enable_offline_mode: () => void;
  disable_offline_mode: (userId: string) => void;

  begin_session: (noHeartBeat?: boolean) => void;
  end_session: () => void;

  track_pageview: (page: string) => void;
  track_clicks: () => void;

  app_version: string;
  storage: 'localstorage' | 'cookie';
  use_session_cookie: boolean;

  /* APM tracking, provided by the countly plugin script countly_boomerang.js
   Does not come with the countly.min.js script and has to be loaded separately
   Relies on the boomerang.min.js script and the countly.min.js script
   */
  track_performance: () => void;

  add_event: (event: CountlyEvent) => void;
  userData: {
    set: (key: string, value: any) => void;
    save: () => void;
  };

  get_device_id: () => string;
  change_id: (newId: string, merge?: boolean) => void;
}

declare global {
  interface Window {
    // Countly is a global object provided by the countly.min.js script
    Countly: Countly;
  }
}
