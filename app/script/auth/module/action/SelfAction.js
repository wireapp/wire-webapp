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

import * as SelfActionCreator from './creator/SelfActionCreator';
import BackendError from './BackendError';
import {APP_NAME} from '../../config';

export function fetchSelf() {
  return function(dispatch, getState, {apiClient}) {
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
      .then(selfUser => dispatch(SelfActionCreator.successfulFetchSelf(selfUser)))
      .catch(error => {
        dispatch(SelfActionCreator.failedFetchSelf(error));
        throw BackendError.handle(error);
      });
  };
}

export function setHandle(handle) {
  return function(dispatch, getState, {apiClient}) {
    dispatch(SelfActionCreator.startSetHandle());
    return apiClient.self.api
      .putHandle({handle: handle.trim().toLowerCase()})
      .then(() => dispatch(fetchSelf()).then(action => action.payload))
      .then(result => dispatch(SelfActionCreator.successfulSetHandle(result)))
      .catch(error => {
        dispatch(SelfActionCreator.failedSetHandle(error));
        throw BackendError.handle(error);
      });
  };
}

export function doGetConsents() {
  return function(dispatch, getState, {apiClient}) {
    dispatch(SelfActionCreator.startGetConsents());
    return apiClient.self.api
      .getConsents()
      .then(({results}) => dispatch(SelfActionCreator.successfulGetConsents(results)))
      .catch(error => {
        dispatch(SelfActionCreator.failedGetConsents(error));
        throw BackendError.handle(error);
      });
  };
}

export function doSetConsent(consentType, value) {
  return function(dispatch, getState, {apiClient}) {
    dispatch(SelfActionCreator.startSetConsent());
    const consent = {
      source: `${APP_NAME} ${z.util.Environment.version(false)}`,
      type: consentType,
      value,
    };
    return apiClient.self.api
      .putConsent(consent)
      .then(() => dispatch(SelfActionCreator.successfulSetConsent(consent)))
      .catch(error => {
        dispatch(SelfActionCreator.failedSetConsent(error));
        throw BackendError.handle(error);
      });
  };
}
