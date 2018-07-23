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
import * as CookieAction from './CookieAction';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {APP_INSTANCE_ID} from '../../config';
import {COOKIE_NAME_APP_OPENED} from '../selector/CookieSelector';
import {BACKEND} from '../../Environment';

export const doLogin = loginData => {
  const onBeforeLogin = dispatch => dispatch(doSilentLogout());

  return doLoginPlain(loginData, onBeforeLogin, dispatch => {});
};

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
      .then(() => core.login(loginData, false, ClientAction.generateClientPayload(loginData.clientType)))
      .then(() => persistAuthData(loginData.clientType, core, dispatch))
      .then(() => dispatch(CookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => onAfterLogin(dispatch, getState, global))
      .then(() => dispatch(ClientAction.doInitializeClient(loginData.clientType, loginData.password)))
      .then(() => dispatch(AuthActionCreator.successfulLogin()))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT || error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw BackendError.handle(error);
      });
  };
}

function handleSSOLogin(code) {
  return new Promise((resolve, reject) => {
    let timerId = undefined;
    const checkWindowTitle = win => {
      const title = win.document.title;
      if (title && title.startsWith('wire:sso:success')) {
        window.clearInterval(timerId);
        win.close();
        resolve();
      }
      if (title && title.startsWith('wire:sso:error')) {
        window.clearInterval(timerId);
        win.close();
        reject(new Error('Failed authentication'));
      }
    };
    const ssoWindow = window.open(
      `${BACKEND.rest}/sso/initiate-login/${code}`,
      '_blank',
      `
        location=no,
        menubar=no,
        resizable=no,
        status=no,
        toolbar=no,
        width=500,
        height=500,
      `
    );
    timerId = setInterval(() => checkWindowTitle(ssoWindow), 1000);
  });
}

export function doLoginSSO({code, clientType}) {
  return function(dispatch, getState, {apiClient, core}) {
    dispatch(AuthActionCreator.startLogin());
    return Promise.resolve()
      .then(() => handleSSOLogin(code))
      .then(() => apiClient.init(clientType))
      .then(() => core.init())
      .then(() => persistAuthData(clientType, core, dispatch))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => dispatch(CookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
      .then(() => dispatch(ClientAction.doInitializeClient(clientType)))
      .then(() => dispatch(AuthActionCreator.successfulLogin()))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT || error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw BackendError.handle(error);
      });
  };
}

function persistAuthData(clientType, core, dispatch) {
  const persist = clientType === ClientType.PERMANENT;
  const accessToken = core.apiClient.accessTokenStore.accessToken;
  const expiresMillis = accessToken.expires_in * 1000;
  const expireTimestamp = Date.now() + expiresMillis;
  const saveTasks = [
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expireTimestamp)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TTL, expiresMillis)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TYPE, accessToken.token_type)),
    dispatch(setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE, accessToken.access_token)),
  ];
  if (clientType !== ClientType.NONE) {
    saveTasks.push(dispatch(setLocalStorage(LocalStorageKey.AUTH.PERSIST, persist)));
  }
  return Promise.all(saveTasks);
}

export function pushAccountRegistrationData(registration) {
  return function(dispatch, getState) {
    return dispatch(AuthActionCreator.pushAccountRegistrationData(registration));
  };
}

export function doRegisterTeam(registration) {
  return function(dispatch, getState, {apiClient, core}) {
    const clientType = ClientType.PERMANENT;
    registration.locale = currentLanguage();
    registration.name = registration.name.trim();
    registration.email = registration.email.trim();
    registration.team.icon = 'default';
    registration.team.binding = true;
    registration.team.currency = currentCurrency();
    registration.team.name = registration.team.name.trim();

    let createdAccount;
    dispatch(AuthActionCreator.startRegisterTeam({...registration, password: '******'}));
    return Promise.resolve()
      .then(() => dispatch(doSilentLogout()))
      .then(() => apiClient.register(registration, clientType))
      .then(newAccount => (createdAccount = newAccount))
      .then(() => core.init())
      .then(() => persistAuthData(clientType, core, dispatch))
      .then(() => dispatch(CookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => dispatch(ClientAction.doInitializeClient(clientType)))
      .then(() => dispatch(AuthActionCreator.successfulRegisterTeam(createdAccount)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          dispatch(AuthActionCreator.successfulRegisterTeam(createdAccount));
        } else {
          dispatch(AuthActionCreator.failedRegisterTeam(error));
        }
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterPersonal(registration) {
  return function(dispatch, getState, {apiClient, core}) {
    const clientType = ClientType.PERMANENT;
    registration.locale = currentLanguage();
    registration.name = registration.name.trim();
    registration.email = registration.email.trim();

    let createdAccount;
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
      .then(() => apiClient.register(registration, clientType))
      .then(newAccount => (createdAccount = newAccount))
      .then(() => core.init())
      .then(() => persistAuthData(clientType, core, dispatch))
      .then(() => dispatch(CookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
      .then(() => dispatch(ClientAction.doInitializeClient(clientType)))
      .then(() => dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount));
        } else {
          dispatch(AuthActionCreator.failedRegisterPersonal(error));
        }
        throw BackendError.handle(error);
      });
  };
}

export function doRegisterWireless(registrationData, options = {shouldInitializeClient: true}) {
  return function(dispatch, getState, {apiClient, core}) {
    const clientType = options.shouldInitializeClient ? ClientType.TEMPORARY : ClientType.NONE;
    registrationData.locale = currentLanguage();
    registrationData.name = registrationData.name.trim();

    let createdAccount;
    const obfuscatedRegistrationData = {
      accent_id: registrationData.accent_id,
      expires_in: registrationData.expires_in,
      locale: registrationData.locale,
      name: registrationData.name,
    };
    dispatch(AuthActionCreator.startRegisterWireless(obfuscatedRegistrationData));

    return Promise.resolve()
      .then(() => dispatch(doSilentLogout()))
      .then(() => apiClient.register(registrationData, clientType))
      .then(newAccount => (createdAccount = newAccount))
      .then(() => core.init())
      .then(() => persistAuthData(clientType, core, dispatch))
      .then(() => dispatch(CookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => clientType !== ClientType.NONE && dispatch(ClientAction.doInitializeClient(clientType)))
      .then(() => dispatch(AuthActionCreator.successfulRegisterWireless(createdAccount)))
      .catch(error => {
        if (error.label === BackendError.LABEL.NEW_CLIENT) {
          dispatch(AuthActionCreator.successfulRegisterWireless(createdAccount));
        } else {
          dispatch(AuthActionCreator.failedRegisterWireless(error));
        }
        throw BackendError.handle(error);
      });
  };
}

export function doInit(options = {isImmediateLogin: false, shouldValidateLocalClient: false}) {
  return function(dispatch, getState, {apiClient, core}) {
    let clientType;
    dispatch(AuthActionCreator.startRefresh());
    return Promise.resolve()
      .then(() => {
        if (options.isImmediateLogin) {
          return dispatch(setLocalStorage(LocalStorageKey.AUTH.PERSIST, true));
        }
      })
      .then(() => dispatch(getLocalStorage(LocalStorageKey.AUTH.PERSIST)))
      .then(persist => {
        if (persist === undefined) {
          throw new Error(`Could not find value for '${LocalStorageKey.AUTH.PERSIST}'`);
        }
        clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
        return apiClient.init(clientType);
      })
      .then(() => core.init())
      .then(() => persistAuthData(clientType, core, dispatch))
      .then(() => {
        if (options.shouldValidateLocalClient) {
          return dispatch(validateLocalClient());
        }
      })
      .then(() => dispatch(SelfAction.fetchSelf()))
      .then(() => dispatch(AuthActionCreator.successfulRefresh(apiClient.accessTokenStore.accessToken)))
      .catch(error => {
        if (options.shouldValidateLocalClient) {
          dispatch(doLogout());
        }
        if (options.isImmediateLogin) {
          dispatch(deleteLocalStorage(LocalStorageKey.AUTH.PERSIST));
        }
        dispatch(AuthActionCreator.failedRefresh(error));
      });
  };
}

function validateLocalClient() {
  return function(dispatch, getState, {core}) {
    dispatch(AuthActionCreator.startValidateLocalClient());
    return Promise.resolve()
      .then(() => core.loadAndValidateLocalClient())
      .then(() => dispatch(AuthActionCreator.successfulValidateLocalClient()))
      .catch(error => {
        dispatch(AuthActionCreator.failedValidateLocalClient(error));
        throw error;
      });
  };
}

export function doLogout() {
  return function(dispatch, getState, {core}) {
    dispatch(AuthActionCreator.startLogout());
    return core
      .logout()
      .then(() => dispatch(CookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
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
      .then(() => dispatch(CookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
      .then(() => dispatch(deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
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
      .catch(error => {
        dispatch(AuthActionCreator.failedGetInvitationFromCode(error));
        throw BackendError.handle(error);
      });
  };
}
