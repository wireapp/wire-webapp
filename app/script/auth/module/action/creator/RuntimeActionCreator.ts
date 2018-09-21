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

import {AppAction} from ".";

export enum RUNTIME_ACTION {
  RUNTIME_CHECK_INDEXEDDB_START = 'RUNTIME_CHECK_INDEXEDDB_START',
  RUNTIME_CHECK_INDEXEDDB_FINISH = 'RUNTIME_CHECK_INDEXEDDB_FINISH',
  RUNTIME_CHECK_COOKIE_START = 'RUNTIME_CHECK_COOKIE_START',
  RUNTIME_CHECK_COOKIE_FINISH = 'RUNTIME_CHECK_COOKIE_FINISH',
  RUNTIME_CONFIRM_SUPPORTED_BROWSER = 'RUNTIME_CONFIRM_SUPPORTED_BROWSER',
}

export type RuntimeActions =
  | typeof RuntimeActionCreator.startCheckIndexedDb & AppAction
  | typeof RuntimeActionCreator.finishCheckIndexedDb & AppAction
  | typeof RuntimeActionCreator.startCheckCookie & AppAction
  | typeof RuntimeActionCreator.finishCheckCookie & AppAction
  | typeof RuntimeActionCreator.confirmSupportedBrowser & AppAction
  ;

export class RuntimeActionCreator {
  static startCheckIndexedDb = () => ({
    type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_START,
  });

  static finishCheckIndexedDb = (result: boolean) => ({
    payload: result,
    type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_FINISH,
  });

  static startCheckCookie = () => ({
    type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_START,
  });

  static finishCheckCookie = (result: boolean) => ({
    payload: result,
    type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_FINISH,
  });

  static confirmSupportedBrowser = () => ({
    type: RUNTIME_ACTION.RUNTIME_CONFIRM_SUPPORTED_BROWSER,
  });
}
