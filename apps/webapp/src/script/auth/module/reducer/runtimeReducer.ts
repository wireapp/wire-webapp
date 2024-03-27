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

import {AppActions, RUNTIME_ACTION} from '../action/creator/';

export interface RuntimeState {
  hasCookieSupport: boolean;
  hasIndexedDbSupport: boolean;
  isCheckingCookie: boolean;
  isCheckingIndexedDb: boolean;
  isSupportedBrowser: boolean;
}

export const initialRuntimeState: RuntimeState = {
  hasCookieSupport: false,
  hasIndexedDbSupport: false,
  isCheckingCookie: false,
  isCheckingIndexedDb: false,
  isSupportedBrowser: false,
};

export function runtimeReducer(state: RuntimeState = initialRuntimeState, action: AppActions): RuntimeState {
  switch (action.type) {
    case RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_START:
      return {
        ...state,
        isCheckingIndexedDb: true,
      };
    case RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_START:
      return {
        ...state,
        isCheckingCookie: true,
      };
    case RUNTIME_ACTION.RUNTIME_CHECK_INDEXEDDB_FINISH:
      return {
        ...state,
        hasIndexedDbSupport: action.payload,
        isCheckingIndexedDb: false,
      };
    case RUNTIME_ACTION.RUNTIME_CHECK_COOKIE_FINISH:
      return {
        ...state,
        hasCookieSupport: action.payload,
        isCheckingCookie: false,
      };
    case RUNTIME_ACTION.RUNTIME_CONFIRM_SUPPORTED_BROWSER:
      return {
        ...state,
        isSupportedBrowser: true,
      };
    default:
      return state;
  }
}
