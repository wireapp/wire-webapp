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

import type {AppAction} from '.';

export enum RUNTIME_ACTION {
  RUNTIME_CHECK_COOKIE_FINISH = 'RUNTIME_CHECK_COOKIE_FINISH',
  RUNTIME_CHECK_COOKIE_START = 'RUNTIME_CHECK_COOKIE_START',
  RUNTIME_CHECK_INDEXEDDB_FINISH = 'RUNTIME_CHECK_INDEXEDDB_FINISH',
  RUNTIME_CHECK_INDEXEDDB_START = 'RUNTIME_CHECK_INDEXEDDB_START',
  RUNTIME_CONFIRM_SUPPORTED_BROWSER = 'RUNTIME_CONFIRM_SUPPORTED_BROWSER',
}

export type RuntimeActions =
  | CheckIndexedDBStartAction
  | CheckIndexedDBSuccessAction
  | CheckCookieStartAction
  | CheckCookieSuccessAction
  | ConfirmSupportedBrowserAction;

export interface CheckIndexedDBStartAction extends AppAction {
  readonly type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_START;
}
export interface CheckIndexedDBSuccessAction extends AppAction {
  readonly payload: boolean;
  readonly type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_FINISH;
}

export interface CheckCookieStartAction extends AppAction {
  readonly type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_START;
}
export interface CheckCookieSuccessAction extends AppAction {
  readonly payload: boolean;
  readonly type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_FINISH;
}

export interface ConfirmSupportedBrowserAction extends AppAction {
  readonly type: RUNTIME_ACTION.RUNTIME_CONFIRM_SUPPORTED_BROWSER;
}

export class RuntimeActionCreator {
  static startCheckIndexedDb = (): CheckIndexedDBStartAction => ({
    type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_START,
  });
  static finishCheckIndexedDb = (result: boolean): CheckIndexedDBSuccessAction => ({
    payload: result,
    type: RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_FINISH,
  });

  static startCheckCookie = (): CheckCookieStartAction => ({
    type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_START,
  });
  static finishCheckCookie = (result: boolean): CheckCookieSuccessAction => ({
    payload: result,
    type: RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_FINISH,
  });

  static confirmSupportedBrowser = (): ConfirmSupportedBrowserAction => ({
    type: RUNTIME_ACTION.RUNTIME_CONFIRM_SUPPORTED_BROWSER,
  });
}
