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

import {currentLanguage} from '../../localeConfig';
import {ThunkAction} from '../reducer';
import {UserActionCreator} from './creator/';

export class UserAction {
  checkHandles = (handles: string[]): ThunkAction<Promise<string>> => {
    return (dispatch, getState, {apiClient}) => {
      return apiClient.user.api.postHandles({handles, return: 1}).then(result => result[0]);
    };
  };

  doSendActivationCode = (email: string): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      dispatch(UserActionCreator.startSendActivationCode());
      return Promise.resolve()
        .then(() => apiClient.user.api.postActivationCode({email, locale: currentLanguage()}))
        .then(() => {
          dispatch(UserActionCreator.successfulSendActivationCode());
        })
        .catch(error => {
          dispatch(UserActionCreator.failedSendActivationCode(error));
          throw error;
        });
    };
  };
}

export const userAction = new UserAction();
