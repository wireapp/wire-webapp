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

import BackendError from './BackendError';
import * as AuthActionCreator from './creator/AuthActionCreator';
import * as SelfAction from './SelfAction';
import {currentLanguage, currentCurrency} from '../../localeConfig';
import {setLocalStorage, LocalStorageKey} from './LocalStorageAction';

export function doLogin(loginData) {
  return function(dispatch, getState, {core}) {
    dispatch(
      AuthActionCreator.startLogin({
        email: loginData.email,
        password: '******',
      })
    );
    return Promise.resolve()
      .then(() => dispatch(doSilentLogout()))
      .then(() => core.login(loginData))
      .then(() => persistAuthData(loginData.persist, core, dispatch))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => dispatch(AuthActionCreator.successfulLogin()))
      .catch(error => {
        const handledError = BackendError.handle(error);
        if (handledError.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
          persistAuthData(loginData.persist, core, dispatch);
        }
        dispatch(AuthActionCreator.failedLogin(error));
        throw handledError;
      });
  };
}

function persistAuthData(persist, core, dispatch) {
  const accessToken = core.apiClient.accessTokenStore.accessToken;
  const expiresMillis = accessToken.expires_in * 1000;
  const expireTimestamp = Date.now() + expiresMillis;
  return Promise.all([
    dispatch(setLocalStorage(LocalStorageKey.AUTH.PERSIST, persist)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expireTimestamp)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TTL, expiresMillis)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TYPE, accessToken.token_type)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE, accessToken.access_token)),
  ]);
}

export function pushAccountRegistrationData(registration) {
  return function(dispatch, getState) {
    return dispatch(AuthActionCreator.pushAccountRegistrationData(registration));
  };
}

export function doRegisterTeam(registration) {
  return function(dispatch, getState, {apiClient}) {
    registration.locale = currentLanguage();
    registration.name = registration.name.trim();
    registration.email = registration.email.trim();
    registration.team.icon = 'default';
    registration.team.binding = true;
    registration.team.currency = currentCurrency();
    registration.team.name = registration.team.name.trim();
    dispatch(AuthActionCreator.startRegisterTeam({...registration, password: '******'}));
    return Promise.resolve()
      .then(() => dispatch(doSilentLogout()))
      .then(() => apiClient.register(registration))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(createdTeam => dispatch(AuthActionCreator.successfulRegisterTeam(createdTeam)))
      .catch(error => {
        dispatch(AuthActionCreator.failedRegisterTeam(error));
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterPersonal(registration) {
  return function(dispatch, getState, {apiClient}) {
    registration.locale = currentLanguage();
    registration.name = registration.name.trim();
    registration.email = registration.email.trim();
    dispatch(
      AuthActionCreator.startRegisterPersonal({
        accent_id: registration.accent_id,
        email: registration.email,
        locale: registration.locale,
        name: registration.name,
        password: '******',
      })
    );
    return Promise.resolve()
      .then(() => dispatch(doSilentLogout()))
      .then(() => apiClient.register(registration))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(createdAccount => dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount)))
      .catch(error => {
        dispatch(AuthActionCreator.failedRegisterPersonal(error));
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterWireless(registration) {
  return function(dispatch, getState, {apiClient}) {
    registration.locale = currentLanguage();
    registration.name = registration.name.trim();
    dispatch(
      AuthActionCreator.startRegisterWireless({
        locale: registration.locale,
        name: registration.name,
      })
    );
    return Promise.resolve()
      .then(() => apiClient.register(registration))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(createdAccount => dispatch(AuthActionCreator.successfulRegisterWireless(createdAccount)))
      .catch(error => {
        dispatch(AuthActionCreator.failedRegisterWireless(error));
        throw BackendError.handle(error);
      });
  };
}

export function doInit() {
  return function(dispatch, getState, {apiClient}) {
    dispatch(AuthActionCreator.startRefresh());
    return apiClient
      .init()
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => dispatch(AuthActionCreator.successfulRefresh(apiClient.accessTokenStore.accessToken)))
      .catch(error => dispatch(AuthActionCreator.failedRefresh(error)));
  };
}

export function doLogout() {
  return function(dispatch, getState, {core}) {
    dispatch(AuthActionCreator.startLogout());
    return core
      .logout()
      .then(() => dispatch(AuthActionCreator.successfulLogout()))
      .catch(error => dispatch(AuthActionCreator.failedLogout(error)));
  };
}

export function doSilentLogout() {
  return function(dispatch, getState, {core}) {
    dispatch(AuthActionCreator.startLogout());
    return core
      .logout()
      .then(() => dispatch(AuthActionCreator.successfulSilentLogout()))
      .catch(error => dispatch(AuthActionCreator.failedLogout(error)));
  };
}

export function getInvitationFromCode(invitationCode) {
  return function(dispatch, getState, {apiClient}) {
    dispatch(AuthActionCreator.startGetInvitationFromCode());
    return apiClient.invitation.api
      .getInvitationInfo(invitationCode)
      .then(invitation => dispatch(AuthActionCreator.successfulGetInvitationFromCode(invitation)))
      .catch(error => dispatch(AuthActionCreator.failedGetInvitationFromCode(error)));
  };
}
