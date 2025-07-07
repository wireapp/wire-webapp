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

import type {DomainData} from '@wireapp/api-client/lib/account/DomainData';
import type {LoginData, RegisterData} from '@wireapp/api-client/lib/auth/';
import {VerificationActionType} from '@wireapp/api-client/lib/auth/VerificationActionType';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {OAuthBody} from '@wireapp/api-client/lib/oauth/OAuthBody';
import {OAuthClient} from '@wireapp/api-client/lib/oauth/OAuthClient';
import type {TeamData} from '@wireapp/api-client/lib/team/';
import {LowDiskSpaceError} from '@wireapp/store-engine/lib/engine/error';
import {StatusCodes as HTTP_STATUS, StatusCodes} from 'http-status-codes';

import {isBackendError} from 'Util/TypePredicateUtil';

import {AuthActionCreator} from './creator/';
import {LabeledError} from './LabeledError';
import {LocalStorageAction, LocalStorageKey} from './LocalStorageAction';

import {currentLanguage} from '../../localeConfig';
import type {Api, RootState, ThunkAction, ThunkDispatch} from '../reducer';
import type {LoginDataState, RegistrationDataState} from '../reducer/authReducer';

type LoginLifecycleFunction = (dispatch: ThunkDispatch, getState: () => RootState, global: Api) => Promise<void>;

const isSystemKeychainAccessError = (error: any): error is Error => {
  return error instanceof Error && error.message.includes('cryption is not available');
};

export class AuthAction {
  doLogin = (loginData: LoginData, getEntropy?: () => Promise<Uint8Array>): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = async (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    return this.doLoginPlain(loginData, onBeforeLogin, undefined, getEntropy);
  };

  doLoginAndJoin = (
    loginData: LoginData,
    key: string,
    code: string,
    uri?: string,
    getEntropy?: () => Promise<Uint8Array>,
    password?: string,
  ): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = async (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    const onAfterLogin: LoginLifecycleFunction = async (
      dispatch,
      getState,
      {actions: {localStorageAction, conversationAction}},
    ) => {
      const conversation = await dispatch(conversationAction.doJoinConversationByCode(key, code, uri, password));
      const domain = conversation?.qualified_conversation?.domain;
      return (
        conversation &&
        (await dispatch(
          localStorageAction.setLocalStorage(LocalStorageKey.AUTH.LOGIN_CONVERSATION_KEY, {
            conversation: conversation.conversation,
            domain,
          }),
        ))
      );
    };

    return this.doLoginPlain(loginData, onBeforeLogin, onAfterLogin, getEntropy);
  };

  doLoginPlain = (
    loginData: LoginData,
    onBeforeLogin: LoginLifecycleFunction = async () => {},
    onAfterLogin: LoginLifecycleFunction = async () => {},
    getEntropy?: () => Promise<Uint8Array>,
  ): ThunkAction => {
    return async (dispatch, getState, global) => {
      const {
        core,
        actions: {clientAction, selfAction, localStorageAction},
      } = global;
      dispatch(AuthActionCreator.startLogin());
      try {
        await onBeforeLogin(dispatch, getState, global);
        await core.login(loginData);
        await this.persistClientData(loginData.clientType, dispatch, localStorageAction);
        await dispatch(selfAction.fetchSelf());
        let entropyData: Uint8Array | undefined = undefined;
        if (getEntropy) {
          const existingClient = await core.service!.client.loadClient();
          entropyData = existingClient ? undefined : await getEntropy();
        }
        await onAfterLogin(dispatch, getState, global);
        await dispatch(
          clientAction.doInitializeClient(
            loginData.clientType,
            loginData.password ? String(loginData.password) : undefined,
            loginData.verificationCode,
            entropyData,
          ),
        );
        dispatch(AuthActionCreator.successfulLogin());
      } catch (error) {
        if (error.label === BackendErrorLabel.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          if (error instanceof LowDiskSpaceError) {
            error = new LabeledError(LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE, error);
          }
          if (isSystemKeychainAccessError(error)) {
            error = new LabeledError(LabeledError.GENERAL_ERRORS.SYSTEM_KEYCHAIN_ACCESS, error);
          }
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw error;
      }
    };
  };

  doPostOAuthCode = (oauthBody: OAuthBody): ThunkAction<Promise<string>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startSendOAuthCode());
      try {
        const url = await apiClient.api.oauth.postOAuthCode(oauthBody);
        dispatch(AuthActionCreator.successfulSendOAuthCode());
        return url;
      } catch (error) {
        dispatch(AuthActionCreator.failedSendOAuthCode(error));
        throw error;
      }
    };
  };

  doSendTwoFactorLoginCode = (email: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startSendTwoFactorCode());
      try {
        await apiClient.api.user.postVerificationCode(email, VerificationActionType.LOGIN);
        dispatch(AuthActionCreator.successfulSendTwoFactorCode());
      } catch (error) {
        /**  The BE can respond quite restrictively to the send code request.
         * We don't want to block the user from logging in if they have already received a code in the last few minutes.
         * Any other error should still be thrown.
         */
        if (isBackendError(error) && SyntheticErrorLabel.TOO_MANY_REQUESTS === error.label) {
          dispatch(AuthActionCreator.successfulSendTwoFactorCode());
          return;
        }
        /**
         * The BE will respond with a 400 if a user tries to use a handle instead of an email.
         */
        if (isBackendError(error) && error.label === BackendErrorLabel.BAD_REQUEST) {
          error = new BackendError(error.message, SyntheticErrorLabel.EMAIL_REQUIRED, StatusCodes.BAD_REQUEST);
        }
        dispatch(AuthActionCreator.failedSendTwoFactorCode(error));
        throw error;
      }
    };
  };

  doFinalizeSSOLogin = ({clientType}: {clientType: ClientType}): ThunkAction => {
    return async (dispatch, getState, {getConfig, core, actions: {clientAction, selfAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startLogin());
      try {
        await core.init(clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(selfAction.fetchSelf());
        await dispatch(clientAction.doInitializeClient(clientType));
        dispatch(AuthActionCreator.successfulLogin());
      } catch (error) {
        if (isBackendError(error) && error.label === BackendErrorLabel.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw error;
      }
    };
  };

  doGetTeamData = (teamId: string): ThunkAction<Promise<TeamData>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startFetchTeam());
      try {
        const teamData = await apiClient.api.teams.team.getTeam(teamId);
        dispatch(AuthActionCreator.successfulFetchTeam(teamData));
        return teamData;
      } catch (error) {
        dispatch(AuthActionCreator.failedFetchTeam(error));
        throw error;
      }
    };
  };

  doGetOAuthApplication = (applicationId: string): ThunkAction<Promise<OAuthClient>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startFetchOAuth());
      try {
        const application = await apiClient.api.oauth.getClient(applicationId);
        dispatch(AuthActionCreator.successfulFetchOAuth(application));
        return application;
      } catch (error) {
        dispatch(AuthActionCreator.failedFetchOAuth(error));
        throw error;
      }
    };
  };

  validateSSOCode = (code: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      const mapError = (error: any) => {
        const statusCode = error?.response?.status;
        if (statusCode === HTTP_STATUS.NOT_FOUND) {
          return new BackendError('', BackendErrorLabel.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
        if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
          return new BackendError('', BackendErrorLabel.SERVER_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
        return new BackendError('', SyntheticErrorLabel.SSO_GENERIC_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
      };

      try {
        return await apiClient.api.auth.headInitiateLogin(code);
      } catch (error) {
        const mappedError = mapError(error);
        dispatch(AuthActionCreator.failedLogin(mappedError));
        throw mappedError;
      }
    };
  };

  private persistClientData = (
    clientType: ClientType,
    dispatch: ThunkDispatch,
    localStorageAction: LocalStorageAction,
  ): Promise<void> => {
    if (clientType === ClientType.NONE) {
      return Promise.resolve();
    }
    const persist = clientType === ClientType.PERMANENT;
    return dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.PERSIST, persist));
  };

  pushAccountRegistrationData = (registration: Partial<RegistrationDataState>): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.pushAccountRegistrationData(registration));
    };
  };

  pushLoginData = (loginData: Partial<LoginDataState>): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.pushLoginData(loginData));
    };
  };

  pushEntropyData = (entropy: Uint8Array): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.pushEntropyData(entropy));
    };
  };

  doRegisterPersonal = (registration: RegisterData, entropyData?: Uint8Array): ThunkAction => {
    return async (
      dispatch,
      getState,
      {getConfig, core, actions: {authAction, clientAction, selfAction, localStorageAction}},
    ) => {
      const clientType = ClientType.PERMANENT;
      registration.locale = currentLanguage();
      registration.name = registration.name.trim();
      registration.email = registration.email.trim();

      dispatch(AuthActionCreator.startRegisterPersonal());
      try {
        await dispatch(authAction.doSilentLogout());
        await core.register(registration, clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(selfAction.fetchSelf());
        await dispatch(clientAction.doInitializeClient(clientType, undefined, undefined, entropyData));
        dispatch(AuthActionCreator.successfulRegisterPersonal(registration));
      } catch (error) {
        dispatch(AuthActionCreator.failedRegisterPersonal(error));
        throw error;
      }
    };
  };

  doRegisterWireless = (
    registrationData: RegisterData,
    options = {shouldInitializeClient: true},
    entropyData?: Uint8Array,
  ): ThunkAction => {
    return async (
      dispatch,
      getState,
      {getConfig, core, actions: {authAction, clientAction, selfAction, localStorageAction}},
    ) => {
      const clientType = options.shouldInitializeClient ? ClientType.TEMPORARY : ClientType.NONE;
      registrationData.locale = currentLanguage();
      registrationData.name = registrationData.name.trim();

      dispatch(AuthActionCreator.startRegisterWireless());
      try {
        await dispatch(authAction.doSilentLogout());
        await core.register(registrationData, clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(selfAction.fetchSelf());
        await (clientType !== ClientType.NONE &&
          dispatch(clientAction.doInitializeClient(clientType, undefined, undefined, entropyData)));
        dispatch(AuthActionCreator.successfulRegisterWireless(registrationData));
      } catch (error) {
        dispatch(AuthActionCreator.failedRegisterWireless(error));
        throw error;
      }
    };
  };

  doInit = (options = {isImmediateLogin: false, shouldValidateLocalClient: false}): ThunkAction => {
    return async (dispatch, getState, {core, actions: {authAction, selfAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startRefresh());
      try {
        if (options.isImmediateLogin) {
          await dispatch(localStorageAction.setLocalStorage(LocalStorageKey.AUTH.PERSIST, true));
        }

        const persist = await dispatch(localStorageAction.getLocalStorage(LocalStorageKey.AUTH.PERSIST));
        if (persist === undefined) {
          throw new Error(`Could not find value for '${LocalStorageKey.AUTH.PERSIST}'`);
        }
        const clientType = persist ? ClientType.PERMANENT : ClientType.TEMPORARY;

        await core.init(clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);

        await dispatch(selfAction.fetchSelf());
        dispatch(AuthActionCreator.successfulRefresh());
      } catch (error) {
        const doLogout = options.shouldValidateLocalClient ? dispatch(authAction.doLogout()) : Promise.resolve();
        const deleteClientType = options.isImmediateLogin
          ? dispatch(localStorageAction.deleteLocalStorage(LocalStorageKey.AUTH.PERSIST))
          : Promise.resolve();
        await Promise.all([doLogout, deleteClientType]);
        dispatch(AuthActionCreator.failedRefresh(error));
      }
    };
  };

  doGetDomainInfo = (domain: string): ThunkAction<Promise<DomainData>> => {
    return async (dispatch, getState, {apiClient}) => {
      return apiClient.api.account.getDomain(domain);
    };
  };

  doGetSSOSettings = (): ThunkAction<Promise<void>> => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startGetSSOSettings());
      try {
        const ssoSettings = await apiClient.api.account.getSSOSettings();
        dispatch(AuthActionCreator.successfulGetSSOSettings(ssoSettings));
      } catch (error) {
        dispatch(AuthActionCreator.failedGetSSOSettings(error));
      }
    };
  };

  doLogout = (): ThunkAction => {
    return async (dispatch, getState, {getConfig, core, actions: {localStorageAction}}) => {
      try {
        await core.logout();
        dispatch(AuthActionCreator.successfulLogout());
      } catch (error) {
        dispatch(AuthActionCreator.failedLogout(error));
      }
    };
  };

  doSilentLogout = (): ThunkAction => {
    return async (dispatch, getState, {getConfig, core, actions: {localStorageAction}}) => {
      try {
        await core.logout();
        dispatch(AuthActionCreator.successfulSilentLogout());
      } catch (error) {
        dispatch(AuthActionCreator.failedLogout(error));
      }
    };
  };

  resetAuthError = (): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.resetError());
    };
  };
}

export const authAction = new AuthAction();
