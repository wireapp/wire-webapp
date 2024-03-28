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

import {UserActionCreator} from './creator/';

import {currentLanguage} from '../../localeConfig';
import type {ThunkAction} from '../reducer';

export class UserAction {
  checkHandles = (handles: string[]): ThunkAction<Promise<string>> => {
    return async (dispatch, getState, {apiClient}) => {
      const [availableHandle] = await apiClient.api.user.postHandles({handles, return: 1});
      return availableHandle;
    };
  };

  doSendActivationCode = (email: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(UserActionCreator.startSendActivationCode());
      try {
        await apiClient.api.user.postActivationCode({email, locale: currentLanguage()});
        dispatch(UserActionCreator.successfulSendActivationCode());
      } catch (error) {
        dispatch(UserActionCreator.failedSendActivationCode(error));
        throw error;
      }
    };
  };
}

export const userAction = new UserAction();
