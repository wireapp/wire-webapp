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
import {currentCurrency, currentLanguage} from '../../localeConfig';
import {deleteLocalStorage, getLocalStorage, LocalStorageKey, setLocalStorage} from './LocalStorageAction';
import * as ConversationAction from './ConversationAction';
import * as ClientAction from './ClientAction';
import * as CookieAction from './CookieAction';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {APP_INSTANCE_ID} from '../../config';
import {COOKIE_NAME_APP_OPENED} from '../selector/CookieSelector';
import {LoginData, RegisterData} from '@wireapp/api-client/dist/commonjs/auth';
import {Dispatch} from 'redux';
import {Api, RootState, ThunkAction} from '../reducer';

type LoginLifecycleFunction = (dispatch: Dispatch, getState: () => RootState, global: Api) => void;

export class AuthAction {
  doLogin = (loginData: LoginData): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    return this.doLoginPlain(loginData, onBeforeLogin);
  };

  doLoginAndJoin = (loginData: LoginData, key: string, code: string, uri: string): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    const onAfterLogin: LoginLifecycleFunction = (dispatch, getState, {actions: {conversationAction}}) =>
      dispatch(conversationAction.doJoinConversationByCode(key, code, uri));

    return this.doLoginPlain(loginData, onBeforeLogin, onAfterLogin);
  };

  doLoginPlain = (
    loginData: LoginData,
    onBeforeLogin: LoginLifecycleFunction = () => {},
    onAfterLogin: LoginLifecycleFunction = () => {}
  ): ThunkAction => {
    return function(dispatch, getState, global) {
      const {
        core,
        actions: {clientAction, cookieAction},
      } = global;

      const obfuscatedLoginData = {...loginData, password: '********'};
      dispatch(AuthActionCreator.startLogin(obfuscatedLoginData));

      return Promise.resolve()
        .then(() => onBeforeLogin(dispatch, getState, global))
        .then(() => core.login(loginData, false, clientAction.generateClientPayload(loginData.clientType)))
        .then(() => this.persistAuthData(loginData.clientType, core, dispatch))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => onAfterLogin(dispatch, getState, global))
        .then(() => dispatch(clientAction.doInitializeClient(loginData.clientType, String(loginData.password))))
        .then(() => {
          dispatch(AuthActionCreator.successfulLogin());
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT || error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
            dispatch(AuthActionCreator.successfulLogin());
          } else {
            dispatch(AuthActionCreator.failedLogin(error));
          }
          throw error;
        });
    };
  };

  doFinalizeSSOLogin = ({clientType}: {clientType: ClientType}): ThunkAction => {
    return function(dispatch, getState, {apiClient, core, actions: {cookieAction, clientAction}}) {
      dispatch(AuthActionCreator.startLogin());
      return Promise.resolve()
        .then(() => apiClient.init(clientType))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch))
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulLogin());
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT || error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
            dispatch(AuthActionCreator.successfulLogin());
          } else {
            dispatch(AuthActionCreator.failedLogin(error));
          }
          throw error;
        });
    };
  };

  validateSSOCode = (code): ThunkAction => {
    return function(dispatch, getState, {apiClient}) {
      const mapError = error => {
        const statusCode = error && error.response && error.response.status;
        if (statusCode === 404) {
          return new BackendError({code: 404, label: BackendError.SSO_ERRORS.SSO_NOT_FOUND});
        }
        if (statusCode >= 500) {
          return new BackendError({code: 500, label: BackendError.SSO_ERRORS.SSO_SERVER_ERROR});
        }
        return new BackendError({code: 500, label: BackendError.SSO_ERRORS.SSO_GENERIC_ERROR});
      };
      return apiClient.auth.api.headInitiateLogin(code).catch(error => {
        const mappedError = mapError(error);
        dispatch(AuthActionCreator.failedLogin(mappedError));
        throw mappedError;
      });
    };
  };

  persistAuthData = (clientType, core, dispatch): Promise<void[]> => {
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
  };

  pushAccountRegistrationData = (registration): ThunkAction => {
    return function(dispatch) {
      return Promise.resolve().then(() => {
        dispatch(AuthActionCreator.pushAccountRegistrationData(registration));
      });
    };
  };

  doRegisterTeam = (registration: RegisterData): ThunkAction => {
    return function(dispatch, getState, {apiClient, core, actions: {cookieAction, clientAction}}) {
      const clientType = ClientType.PERMANENT;
      registration.locale = currentLanguage();
      registration.name = registration.name.trim();
      registration.email = registration.email.trim();
      registration.team.icon = 'default';
      registration.team.binding = true;
      // TODO: Fixed once core v6 is inside
      // eslint-disable-next-line dot-notation
      registration.team['currency'] = currentCurrency();
      registration.team.name = registration.team.name.trim();

      let createdAccount;
      dispatch(AuthActionCreator.startRegisterTeam({...registration, password: '******'}));
      return Promise.resolve()
        .then(() => dispatch(this.doSilentLogout()))
        .then(() => apiClient.register(registration, clientType))
        .then(newAccount => (createdAccount = newAccount))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterTeam(createdAccount));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterTeam(createdAccount));
          } else {
            dispatch(AuthActionCreator.failedRegisterTeam(error));
          }
          throw error;
        });
    };
  };

  doRegisterPersonal = (registration: RegisterData): ThunkAction => {
    return function(dispatch, getState, {apiClient, core, actions: {authAction, clientAction, cookieAction}}) {
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
        .then(() => dispatch(authAction.doSilentLogout()))
        .then(() => apiClient.register(registration, clientType))
        .then(newAccount => (createdAccount = newAccount))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterPersonal(createdAccount));
          } else {
            dispatch(AuthActionCreator.failedRegisterPersonal(error));
          }
          throw error;
        });
    };
  };

  doRegisterWireless = (registrationData: RegisterData, options = {shouldInitializeClient: true}): ThunkAction => {
    return function(dispatch, getState, {apiClient, core, actions: {authAction, cookieAction, clientAction}}) {
      const clientType = options.shouldInitializeClient ? ClientType.TEMPORARY : ClientType.NONE;
      registrationData.locale = currentLanguage();
      registrationData.name = registrationData.name.trim();

      let createdAccount;
      const obfuscatedRegistrationData = {
        accent_id: registrationData.accent_id,
        // TODO: Apply method call once core v6 is in
        // eslint-disable-next-line dot-notation
        expires_in: registrationData['expires_in'],
        locale: registrationData.locale,
        name: registrationData.name,
      };
      dispatch(AuthActionCreator.startRegisterWireless(obfuscatedRegistrationData));

      return Promise.resolve()
        .then(() => dispatch(authAction.doSilentLogout()))
        .then(() => apiClient.register(registrationData, clientType))
        .then(newAccount => (createdAccount = newAccount))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => clientType !== ClientType.NONE && dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterWireless(createdAccount));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterWireless(createdAccount));
          } else {
            dispatch(AuthActionCreator.failedRegisterWireless(error));
          }
          throw error;
        });
    };
  };

  doInit = (options = {isImmediateLogin: false, shouldValidateLocalClient: false}): ThunkAction => {
    return function(dispatch, getState, {apiClient, core, actions: {authAction, clientAction}}) {
      let clientType;
      dispatch(AuthActionCreator.startRefresh());
      return Promise.resolve()
        .then(() => {
          if (options.isImmediateLogin) {
            return dispatch(setLocalStorage(LocalStorageKey.AUTH.PERSIST, true));
          }
          return undefined;
        })
        .then(() => dispatch(getLocalStorage(LocalStorageKey.AUTH.PERSIST)))
        .then((persist: boolean) => {
          if (persist === undefined) {
            throw new Error(`Could not find value for '${LocalStorageKey.AUTH.PERSIST}'`);
          }
          clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
          return apiClient.init(clientType);
        })
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch))
        .then(() => {
          if (options.shouldValidateLocalClient) {
            return dispatch(clientAction.validateLocalClient());
          }
          return undefined;
        })
        .then(() => dispatch(SelfAction.fetchSelf()))
        .then(() => {
          dispatch(AuthActionCreator.successfulRefresh());
        })
        .catch(error => {
          if (options.shouldValidateLocalClient) {
            dispatch(authAction.doLogout());
          }
          if (options.isImmediateLogin) {
            dispatch(deleteLocalStorage(LocalStorageKey.AUTH.PERSIST));
          }
          dispatch(AuthActionCreator.failedRefresh(error));
        });
    };
  };

  validateLocalClient = (): ThunkAction => {
    return function(dispatch, getState, {core}) {
      dispatch(AuthActionCreator.startValidateLocalClient());
      return Promise.resolve()
        .then(() => core.loadAndValidateLocalClient())
        .then(() => {
          dispatch(AuthActionCreator.successfulValidateLocalClient());
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedValidateLocalClient(error));
          throw error;
        });
    };
  };

  doLogout = (): ThunkAction => {
    return function(dispatch, getState, {core, actions: {cookieAction}}) {
      dispatch(AuthActionCreator.startLogout());
      return core
        .logout()
        .then(() => dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
        .then(() => dispatch(deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
        .then(() => {
          dispatch(AuthActionCreator.successfulLogout());
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedLogout(error));
        });
    };
  };

  doSilentLogout = (): ThunkAction => {
    return function(dispatch, getState, {core, actions: {cookieAction}}) {
      dispatch(AuthActionCreator.startLogout());
      return core
        .logout()
        .then(() => dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
        .then(() => dispatch(deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
        .then(() => {
          dispatch(AuthActionCreator.successfulSilentLogout());
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedLogout(error));
        });
    };
  };

  getInvitationFromCode = (invitationCode: string): ThunkAction => {
    return function(dispatch, getState, {apiClient}) {
      dispatch(AuthActionCreator.startGetInvitationFromCode());
      return apiClient.invitation.api
        .getInvitationInfo(invitationCode)
        .then(invitation => {
          dispatch(AuthActionCreator.successfulGetInvitationFromCode(invitation));
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedGetInvitationFromCode(error));
          throw error;
        });
    };
  };
}

export const authAction = new AuthAction();
