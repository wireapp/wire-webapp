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

import {ConsentType, Self} from '@wireapp/api-client/dist/commonjs/self';
import * as config from '../../config';
import {ThunkAction} from '../reducer';
import {SelfActionCreator} from './creator/';

export class SelfAction {
  fetchSelf = (): ThunkAction<Promise<Self>> => {
    return (dispatch, getState, {apiClient}) => {
      dispatch(SelfActionCreator.startFetchSelf());
      return apiClient.self.api
        .getSelf()
        .then(selfUser => {
          return apiClient.teams.team.api.getTeams().then(({teams}) => {
            const [boundTeam] = teams.filter(team => team.binding);
            selfUser.team = boundTeam && boundTeam.id;
            return selfUser;
          });
        })
        .then(selfUser => {
          dispatch(SelfActionCreator.successfulFetchSelf(selfUser));
          return selfUser;
        })
        .catch(error => {
          dispatch(SelfActionCreator.failedFetchSelf(error));
          throw error;
        });
    };
  };

  setHandle = (handle: string): ThunkAction => {
    return (dispatch, getState, {apiClient, actions: {selfAction}}) => {
      dispatch(SelfActionCreator.startSetHandle());
      return apiClient.self.api
        .putHandle({handle: handle.trim().toLowerCase()})
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(result => {
          dispatch(SelfActionCreator.successfulSetHandle(result));
        })
        .catch(error => {
          dispatch(SelfActionCreator.failedSetHandle(error));
          throw error;
        });
    };
  };

  doGetConsents = (): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      if (!config.FEATURE.CHECK_CONSENT) {
        console.warn('Consent check feature is disabled.');
        return Promise.resolve();
      }
      dispatch(SelfActionCreator.startGetConsents());
      return apiClient.self.api
        .getConsents()
        .then(({results}) => {
          dispatch(SelfActionCreator.successfulGetConsents(results));
        })
        .catch(error => {
          dispatch(SelfActionCreator.failedGetConsents(error));
          throw error;
        });
    };
  };

  doSetConsent = (consentType: ConsentType, value: number): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      if (!config.FEATURE.CHECK_CONSENT) {
        console.warn('Consent check feature is disabled.');
        return Promise.resolve();
      }
      dispatch(SelfActionCreator.startSetConsent());
      const consent = {
        source: `${config.APP_NAME} ${window.z.util.Environment.version(false)}`,
        type: consentType,
        value,
      };
      return apiClient.self.api
        .putConsent(consent)
        .then(() => {
          dispatch(SelfActionCreator.successfulSetConsent(consent));
        })
        .catch(error => {
          dispatch(SelfActionCreator.failedSetConsent(error));
          throw error;
        });
    };
  };
}

export const selfAction = new SelfAction();
