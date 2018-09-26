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

import {ThunkAction} from '../reducer';
import {NotificationActionCreator} from './creator/';

export class NotificationAction {
  checkHistory = (): ThunkAction => {
    return (dispatch, getState, {core}) => {
      dispatch(NotificationActionCreator.startCheckHistory());
      return Promise.resolve()
        .then(() => core.service.notification.hasHistory())
        .then(hasHistory => {
          dispatch(NotificationActionCreator.successfulCheckHistory(hasHistory));
        })
        .catch(error => {
          dispatch(NotificationActionCreator.failedCheckHistory(error));
          throw error;
        });
    };
  };

  resetHistoryCheck = (): ThunkAction => {
    return dispatch => {
      return Promise.resolve().then(() => {
        dispatch(NotificationActionCreator.resetHistoryCheck());
      });
    };
  };

  setLastEventDate = (lastEventDate: Date): ThunkAction => {
    return (dispatch, getState, {core}) => {
      return Promise.resolve().then(() => {
        // TODO: Update call to private method once core v6 is inside!
        // eslint-disable-next-line dot-notation
        core.service.notification['setLastEventDate'](lastEventDate);
      });
    };
  };
}

export const notificationAction = new NotificationAction();
