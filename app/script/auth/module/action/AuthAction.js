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
import {deleteLocalStorage, getLocalStorage, setLocalStorage, LocalStorageKey} from './LocalStorageAction';
import * as ConversationAction from './ConversationAction';
import * as ClientAction from './ClientAction';
import * as TrackingAction from './TrackingAction';
import {ClientType} from '@wireapp/core/dist/client/root';

export const doLogin = loginData => doLoginPlain(loginData, dispatch => dispatch(doSilentLogout()), dispatch => {});

export const doLoginAndJoin = (loginData, key, code, uri) => {
  const onBeforeLogin = dispatch => dispatch(doSilentLogout());
  const onAfterLogin = dispatch => dispatch(ConversationAction.doJoinConversationByCode(key, code, uri));

  return doLoginPlain(loginData, onBeforeLogin, onAfterLogin);
};

function doLoginPlain(loginData, onBeforeLogin, onAfterLogin) {
  return function(dispatch, getState, global) {
    const {core} = global;

    const obfuscatedLoginData = {...loginData, password: '********'};
    dispatch(AuthActionCreator.startLogin(obfuscatedLoginData));

    return Promise.resolve()
      .then(() => onBeforeLogin(dispatch, getState, global))
      .then(() => core.login(loginData, false, ClientAction.generateClientPayload(loginData.persist)))
      .then(() => persistAuthData(loginData.persist, core, dispatch))
      .then(() => {
        const loginContext = loginData.email ? 'email' : 'handle';
        const trackingEventData = {
          attributes: {context: loginContext, remember_me: loginData.persist},
          name: TrackingAction.EVENT_NAME.ACCOUNT.LOGGED_IN,
        };
        return TrackingAction.trackEvent(trackingEventData);
      })
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => onAfterLogin(dispatch, getState, global))
      .then(() => dispatch(ClientAction.doInitializeClient(loginData.persist, loginData.password)))
      .then(() => dispatch(AuthActionCreator.successfulLogin()))
      .catch(error => {
        const handledError = BackendError.handle(error);
        if (handledError.label === BackendError.LABEL.NEW_CLIENT) {
          dispatch(ClientAction.doGetAllClients());
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
  return function(dispatch, getState, {apiClient, core}) {
    const isPermanentClient = true;
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
      .then(() => apiClient.register(registration, isPermanentClient))
      .then(() => core.init())
      .then(() => persistAuthData(isPermanentClient, core, dispatch))
      .then(() => dispatch(ClientAction.doInitializeClient(isPermanentClient)))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(createdTeam => dispatch(AuthActionCreator.successfulRegisterTeam(createdTeam)))
      .catch(error => {
        dispatch(AuthActionCreator.failedRegisterTeam(error));
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterPersonal(registration) {
  return function(dispatch, getState, {apiClient, core}) {
    const isPermanentClient = true;
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
      .then(() => apiClient.register(registration, isPermanentClient))
      .then(() => persistAuthData(isPermanentClient, core, dispatch))
      .then(() => core.init())
      .then(() => dispatch(ClientAction.doInitializeClient(isPermanentClient)))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(createdAccount => dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount)))
      .catch(error => {
        dispatch(AuthActionCreator.failedRegisterPersonal(error));
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterWireless(registrationData) {
  return function(dispatch, getState, {apiClient, core}) {
    const isPermanentClient = false;
    registrationData.locale = currentLanguage();
    registrationData.name = registrationData.name.trim();

    const obfuscatedRegistrationData = {locale: registrationData.locale, name: registrationData.name};
    dispatch(AuthActionCreator.startRegisterWireless(obfuscatedRegistrationData));

    return Promise.resolve()
      .then(() => apiClient.register(registrationData, isPermanentClient))
      .then(() => persistAuthData(isPermanentClient, core, dispatch))
      .then(() => core.init())
      .then(() => dispatch(ClientAction.doInitializeClient(isPermanentClient)))
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
    return Promise.resolve()
      .then(() => dispatch(getLocalStorage(LocalStorageKey.AUTH.PERSIST)))
      .then(persist => {
        if (persist === undefined) {
          throw new Error(`Could not find value for '${LocalStorageKey.AUTH.PERSIST}'`);
        }
        apiClient.init(persist ? ClientType.PERMANENT : ClientType.TEMPORARY);
      })
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
      .then(() => dispatch(deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
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
