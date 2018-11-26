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

import {LoginData, RegisterData} from '@wireapp/api-client/dist/commonjs/auth';
import {ClientType} from '@wireapp/api-client/dist/commonjs/client/index';
import {Account} from '@wireapp/core';
import {LowDiskSpaceError} from '@wireapp/store-engine/dist/commonjs/engine/error/';
import {APP_INSTANCE_ID} from '../../config';
import {currentCurrency, currentLanguage} from '../../localeConfig';
import {Api, RootState, ThunkAction, ThunkDispatch} from '../reducer';
import {RegistrationDataState} from '../reducer/authReducer';
import {COOKIE_NAME_APP_OPENED} from '../selector/CookieSelector';
import BackendError from './BackendError';
import {AuthActionCreator} from './creator/';
import LabeledError from './LabeledError';
import {LocalStorageAction, LocalStorageKey} from './LocalStorageAction';

type LoginLifecycleFunction = (dispatch: ThunkDispatch, getState: () => RootState, global: Api) => void;

export class AuthAction {
  doLogin = (loginData: LoginData): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    return this.doLoginPlain(loginData, onBeforeLogin);
  };

  doLoginAndJoin = (loginData: LoginData, key: string, code: string, uri?: string): ThunkAction => {
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
    return (dispatch, getState, global) => {
      const {
        core,
        actions: {clientAction, cookieAction, selfAction, localStorageAction},
      } = global;

      dispatch(AuthActionCreator.startLogin());

      return Promise.resolve()
        .then(() => onBeforeLogin(dispatch, getState, global))
        .then(() => core.login(loginData, false, clientAction.generateClientPayload(loginData.clientType)))
        .then(() => this.persistAuthData(loginData.clientType, core, dispatch, localStorageAction))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(() => onAfterLogin(dispatch, getState, global))
        .then(() => dispatch(clientAction.doInitializeClient(loginData.clientType, String(loginData.password))))
        .then(() => {
          dispatch(AuthActionCreator.successfulLogin());
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT || error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
            dispatch(AuthActionCreator.successfulLogin());
          } else {
            if (error instanceof LowDiskSpaceError) {
              error = new LabeledError(LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE, error);
            }
            dispatch(AuthActionCreator.failedLogin(error));
          }
          throw error;
        });
    };
  };

  doFinalizeSSOLogin = ({clientType}: {clientType: ClientType}): ThunkAction => {
    return (
      dispatch,
      getState,
      {apiClient, core, actions: {cookieAction, clientAction, selfAction, localStorageAction}}
    ) => {
      dispatch(AuthActionCreator.startLogin());
      return Promise.resolve()
        .then(() => apiClient.init(clientType))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch, localStorageAction))
        .then(() => dispatch(selfAction.fetchSelf()))
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

  validateSSOCode = (code: string): ThunkAction => {
    return (dispatch, getState, {apiClient}) => {
      const mapError = (error: any) => {
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

  persistAuthData = (
    clientType: ClientType,
    core: Account,
    dispatch: ThunkDispatch,
    localStorageAction: LocalStorageAction
  ): Promise<void[]> => {
    const persist = clientType === ClientType.PERMANENT;
    // TODO: Fixed once core v6 is inside
    // eslint-disable-next-line dot-notation
    const accessToken = core['apiClient'].accessTokenStore.accessToken;
    const expiresMillis = accessToken.expires_in * 1000;
    const expireTimestamp = Date.now() + expiresMillis;
    const saveTasks = [
      dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.EXPIRATION, expireTimestamp)),
      dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TTL, expiresMillis)),
      dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.TYPE, accessToken.token_type)),
      dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE, accessToken.access_token)),
    ];
    if (clientType !== ClientType.NONE) {
      saveTasks.push(dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.PERSIST, persist)));
    }
    return Promise.all(saveTasks);
  };

  pushAccountRegistrationData = (registration: Partial<RegistrationDataState>): ThunkAction => {
    return dispatch => {
      return Promise.resolve().then(() => {
        dispatch(AuthActionCreator.pushAccountRegistrationData(registration));
      });
    };
  };

  doRegisterTeam = (registration: RegisterData): ThunkAction => {
    return (
      dispatch,
      getState,
      {apiClient, core, actions: {cookieAction, clientAction, selfAction, localStorageAction}}
    ) => {
      const clientType = ClientType.PERMANENT;
      registration.locale = currentLanguage();
      registration.name = registration.name.trim();
      registration.email = registration.email.trim();
      registration.team.icon = 'default';
      registration.team.binding = true;
      // TODO: Fixed once core v6 is inside
      // eslint-disable-next-line dot-notation
      // @ts-ignore
      registration.team['currency'] = currentCurrency();
      registration.team.name = registration.team.name.trim();

      dispatch(AuthActionCreator.startRegisterTeam());
      return Promise.resolve()
        .then(() => dispatch(this.doSilentLogout()))
        .then(() => apiClient.register(registration, clientType))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch, localStorageAction))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(() => dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterTeam(registration));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterTeam(registration));
          } else {
            dispatch(AuthActionCreator.failedRegisterTeam(error));
          }
          throw error;
        });
    };
  };

  doRegisterPersonal = (registration: RegisterData): ThunkAction => {
    return (
      dispatch,
      getState,
      {apiClient, core, actions: {authAction, clientAction, cookieAction, selfAction, localStorageAction}}
    ) => {
      const clientType = ClientType.PERMANENT;
      registration.locale = currentLanguage();
      registration.name = registration.name.trim();
      registration.email = registration.email.trim();

      dispatch(AuthActionCreator.startRegisterPersonal());
      return Promise.resolve()
        .then(() => dispatch(authAction.doSilentLogout()))
        .then(() => apiClient.register(registration, clientType))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch, localStorageAction))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(() => dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterPersonal(registration));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterPersonal(registration));
          } else {
            dispatch(AuthActionCreator.failedRegisterPersonal(error));
          }
          throw error;
        });
    };
  };

  doRegisterWireless = (registrationData: RegisterData, options = {shouldInitializeClient: true}): ThunkAction => {
    return (
      dispatch,
      getState,
      {apiClient, core, actions: {authAction, cookieAction, clientAction, selfAction, localStorageAction}}
    ) => {
      const clientType = options.shouldInitializeClient ? ClientType.TEMPORARY : ClientType.NONE;
      registrationData.locale = currentLanguage();
      registrationData.name = registrationData.name.trim();

      dispatch(AuthActionCreator.startRegisterWireless());

      return Promise.resolve()
        .then(() => dispatch(authAction.doSilentLogout()))
        .then(() => apiClient.register(registrationData, clientType))
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch, localStorageAction))
        .then(() => dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: APP_INSTANCE_ID})))
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(() => clientType !== ClientType.NONE && dispatch(clientAction.doInitializeClient(clientType)))
        .then(() => {
          dispatch(AuthActionCreator.successfulRegisterWireless(registrationData));
        })
        .catch(error => {
          if (error.label === BackendError.LABEL.NEW_CLIENT) {
            dispatch(AuthActionCreator.successfulRegisterWireless(registrationData));
          } else {
            dispatch(AuthActionCreator.failedRegisterWireless(error));
          }
          throw error;
        });
    };
  };

  doInit = (options = {isImmediateLogin: false, shouldValidateLocalClient: false}): ThunkAction => {
    return (
      dispatch,
      getState,
      {apiClient, core, actions: {authAction, clientAction, selfAction, localStorageAction}}
    ) => {
      let clientType: ClientType;
      dispatch(AuthActionCreator.startRefresh());
      return Promise.resolve()
        .then(() => {
          if (options.isImmediateLogin) {
            return dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.PERSIST, true));
          }
          return undefined;
        })
        .then(() => dispatch(localStorageAction.getLocalStorage(LocalStorageKey.AUTH.PERSIST)))
        .then((persist: boolean) => {
          if (persist === undefined) {
            throw new Error(`Could not find value for '${LocalStorageKey.AUTH.PERSIST}'`);
          }
          clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;
          return apiClient.init(clientType);
        })
        .then(() => core.init())
        .then(() => this.persistAuthData(clientType, core, dispatch, localStorageAction))
        .then(() => {
          if (options.shouldValidateLocalClient) {
            return dispatch(authAction.validateLocalClient());
          }
          return undefined;
        })
        .then(() => dispatch(selfAction.fetchSelf()))
        .then(() => {
          dispatch(AuthActionCreator.successfulRefresh());
        })
        .catch(error => {
          const doLogout = options.shouldValidateLocalClient ? dispatch(authAction.doLogout()) : Promise.resolve();
          const deleteClientType = options.isImmediateLogin
            ? dispatch(localStorageAction.deleteLocalStorage(LocalStorageKey.AUTH.PERSIST))
            : Promise.resolve();

          return Promise.all([doLogout, deleteClientType])
            .catch(() => undefined)
            .then(() => {
              dispatch(AuthActionCreator.failedRefresh(error));
            });
        });
    };
  };

  validateLocalClient = (): ThunkAction => {
    return (dispatch, getState, {core}) => {
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
    return (dispatch, getState, {core, actions: {cookieAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startLogout());
      return core
        .logout()
        .then(() => dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
        .then(() => dispatch(localStorageAction.deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
        .then(() => {
          dispatch(AuthActionCreator.successfulLogout());
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedLogout(error));
        });
    };
  };

  doSilentLogout = (): ThunkAction => {
    return (dispatch, getState, {core, actions: {cookieAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startLogout());
      return core
        .logout()
        .then(() => dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, APP_INSTANCE_ID)))
        .then(() => dispatch(localStorageAction.deleteLocalStorage(LocalStorageKey.AUTH.ACCESS_TOKEN.VALUE)))
        .then(() => {
          dispatch(AuthActionCreator.successfulSilentLogout());
        })
        .catch(error => {
          dispatch(AuthActionCreator.failedLogout(error));
        });
    };
  };

  enterPersonalCreationFlow = (): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.enterPersonalCreationFlow());
    };
  };

  enterTeamCreationFlow = (): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.enterTeamCreationFlow());
    };
  };

  enterGenericInviteCreationFlow = (): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.enterGenericInviteCreationFlow());
    };
  };

  resetAuthError = (): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.resetError());
    };
  };
}

export const authAction = new AuthAction();
