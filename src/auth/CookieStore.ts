/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {EventEmitter} from 'events';

import {Runtime} from '@wireapp/commons';

import {Cookie} from './Cookie';

enum TOPIC {
  COOKIE_REFRESH = 'CookieStore.TOPIC.COOKIE_REFRESH',
}

export class CookieStore {
  private static cookie?: Cookie;
  public static emitter = new EventEmitter().setMaxListeners(20);

  public static readonly TOPIC = TOPIC;

  static getCookie(): Cookie | undefined {
    return CookieStore.cookie;
  }

  private static emit(): void {
    if (Runtime.isNode()) {
      CookieStore.emitter.emit(CookieStore.TOPIC.COOKIE_REFRESH, CookieStore.cookie);
    }
  }

  static setCookie(cookie?: Cookie): void {
    CookieStore.cookie = cookie;
    CookieStore.emit();
  }

  static deleteCookie(): void {
    CookieStore.cookie = undefined;
    CookieStore.emit();
  }
}
