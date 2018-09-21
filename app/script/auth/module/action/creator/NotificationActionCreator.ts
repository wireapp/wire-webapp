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

export enum NOTIFICATION_ACTION {
  NOTIFICATION_CHECK_HISTORY_START = 'NOTIFICATION_CHECK_HISTORY_START',
  NOTIFICATION_CHECK_HISTORY_SUCCESS = 'NOTIFICATION_CHECK_HISTORY_SUCCESS',
  NOTIFICATION_CHECK_HISTORY_FAILED = 'NOTIFICATION_CHECK_HISTORY_FAILED',

  NOTIFICATION_CHECK_HISTORY_RESET = 'NOTIFICATION_CHECK_HISTORY_RESET',
}

export type NotificationActions =
  | typeof NotificationActionCreator.startCheckHistory & AppAction
  | typeof NotificationActionCreator.successfulCheckHistory & AppAction
  | typeof NotificationActionCreator.failedCheckHistory & AppAction
  | typeof NotificationActionCreator.resetHistoryCheck & AppAction
  ;

export class NotificationActionCreator {
  static startCheckHistory = () => ({
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_START,
  });

  static successfulCheckHistory = hasHistory => ({
    payload: hasHistory,
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_SUCCESS,
  });

  static failedCheckHistory = (error?: any) => ({
    payload: error,
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_FAILED,
  });

  static resetHistoryCheck = () => ({
    type: NOTIFICATION_ACTION.NOTIFICATION_CHECK_HISTORY_RESET,
  });
}
