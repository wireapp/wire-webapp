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

import * as UserActionCreator from './creator/UserActionCreator';
import {currentLanguage} from '../../localeConfig';

export function doActivateAccount(code, key) {
  const params = [...arguments];
  return function(dispatch, getState, {apiClient}) {
    dispatch(UserActionCreator.startAccountActivation(params));
    return Promise.resolve()
      .then(() => apiClient.user.api.postActivation({code, dryrun: false, key}))
      .then(activationResponse => dispatch(UserActionCreator.successfulAccountActivation(activationResponse)))
      .catch(error => {
        dispatch(UserActionCreator.failedAccountActivation(error));
        throw error;
      });
  };
}

export function doSendActivationCode(email) {
  const params = [...arguments];
  return function(dispatch, getState, {apiClient}) {
    dispatch(UserActionCreator.startSendActivationCode(params));
    return Promise.resolve()
      .then(() => apiClient.user.api.postActivationCode({email, locale: currentLanguage()}))
      .then(activationResponse => dispatch(UserActionCreator.successfulSendActivationCode(activationResponse)))
      .catch(error => {
        dispatch(UserActionCreator.failedSendActivationCode(error));
        throw error;
      });
  };
}

export function checkHandles(handles) {
  return function(dispatch, getState, {apiClient}) {
    return apiClient.user.api.postHandles({handles, return: 1}).then(result => result[0]);
  };
}
