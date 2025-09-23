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

import type {ChangePassword, ConsentType, Self} from '@wireapp/api-client/lib/self/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Environment} from 'Util/Environment';
import {getLogger} from 'Util/Logger';

import {SelfActionCreator} from './creator/';

import type {ThunkAction} from '../reducer';

const logger = getLogger('SelfAction');

export class SelfAction {
  fetchSelf = (): ThunkAction<Promise<Self>> => {
    return async (dispatch, getState, {actions: {selfAction}, apiClient}) => {
      dispatch(SelfActionCreator.startFetchSelf());
      try {
        const selfUser = await apiClient.api.self.getSelf();
        await dispatch(selfAction.doCheckPasswordState());
        dispatch(SelfActionCreator.successfulFetchSelf(selfUser));
        return selfUser;
      } catch (error) {
        dispatch(SelfActionCreator.failedFetchSelf(error));
        throw error;
      }
    };
  };

  setHandle = (handle: string): ThunkAction => {
    return async (dispatch, getState, {apiClient, actions: {selfAction}}) => {
      dispatch(SelfActionCreator.startSetHandle());
      try {
        await apiClient.api.self.putHandle({handle: handle.trim().toLowerCase()});
        const selfUser = await dispatch(selfAction.fetchSelf());
        dispatch(SelfActionCreator.successfulSetHandle(selfUser));
      } catch (error) {
        dispatch(SelfActionCreator.failedSetHandle(error));
        throw error;
      }
    };
  };

  doGetConsents = (): ThunkAction => {
    return async (dispatch, getState, {apiClient, getConfig}) => {
      if (!getConfig().FEATURE.CHECK_CONSENT) {
        logger.warn('Consent check feature is disabled.');
        return Promise.resolve();
      }
      dispatch(SelfActionCreator.startGetConsents());
      try {
        const {results} = await apiClient.api.self.getConsents();
        dispatch(SelfActionCreator.successfulGetConsents(results));
      } catch (error) {
        dispatch(SelfActionCreator.failedGetConsents(error));
        throw error;
      }
    };
  };

  doSetConsent = (consentType: ConsentType, value: number): ThunkAction => {
    return async (dispatch, getState, {apiClient, getConfig}) => {
      if (!getConfig().FEATURE.CHECK_CONSENT) {
        logger.warn('Consent check feature is disabled.');
        return Promise.resolve();
      }
      dispatch(SelfActionCreator.startSetConsent());
      const consent = {
        source: `${getConfig().APP_NAME} ${Environment.version(false)}`,
        type: consentType,
        value,
      };
      try {
        await apiClient.api.self.putConsent(consent);
        dispatch(SelfActionCreator.successfulSetConsent(consent));
      } catch (error) {
        dispatch(SelfActionCreator.failedSetConsent(error));
        throw error;
      }
    };
  };

  doSetPassword = (changePassword: ChangePassword): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(SelfActionCreator.startSetSelfPassword());
      try {
        await apiClient.api.self.putPassword(changePassword);
        dispatch(SelfActionCreator.successfulSetSelfPassword());
      } catch (error) {
        dispatch(SelfActionCreator.failedSetSelfPassword(error));
        throw error;
      }
    };
  };

  doSetEmail = (email: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(SelfActionCreator.startSetSelfEmail());
      try {
        await apiClient.api.auth.putEmail({email});
        dispatch(SelfActionCreator.successfulSetSelfEmail(email));
      } catch (error) {
        dispatch(SelfActionCreator.failedSetSelfEmail(error));
        throw error;
      }
    };
  };

  doCheckPasswordState = (): ThunkAction<Promise<boolean>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(SelfActionCreator.startSetPasswordState());
      try {
        await apiClient.api.self.headPassword();
        dispatch(SelfActionCreator.successfulSetPasswordState({hasPassword: true}));
        return true;
      } catch (error) {
        if (error.response?.status === HTTP_STATUS.NOT_FOUND) {
          dispatch(SelfActionCreator.successfulSetPasswordState({hasPassword: false}));
          return false;
        }
        dispatch(SelfActionCreator.failedSetPasswordState(error));
        throw error;
      }
    };
  };
}

export const selfAction = new SelfAction();
