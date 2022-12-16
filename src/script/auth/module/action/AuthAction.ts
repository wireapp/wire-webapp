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
import type {LoginData, RegisterData, SendLoginCode} from '@wireapp/api-client/lib/auth/';
import {VerificationActionType} from '@wireapp/api-client/lib/auth/VerificationActionType';
import {ClientType} from '@wireapp/api-client/lib/client/';
import {LowDiskSpaceError} from '@wireapp/store-engine/lib/engine/error';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import type {CRUDEngine} from '@wireapp/store-engine';
import {SQLeetEngine} from '@wireapp/store-engine-sqleet';

import {isTemporaryClientAndNonPersistent} from 'Util/util';

import {BackendError} from './BackendError';
import {AuthActionCreator} from './creator/';
import {LabeledError} from './LabeledError';
import {LocalStorageAction, LocalStorageKey} from './LocalStorageAction';

import {currentCurrency, currentLanguage} from '../../localeConfig';
import type {Api, RootState, ThunkAction, ThunkDispatch} from '../reducer';
import type {RegistrationDataState} from '../reducer/authReducer';
import {COOKIE_NAME_APP_OPENED} from '../selector/CookieSelector';

type LoginLifecycleFunction = (dispatch: ThunkDispatch, getState: () => RootState, global: Api) => Promise<void>;

export class AuthAction {
  doFlushDatabase = (): ThunkAction => {
    return async (dispatch, getState, {core}) => {
      const storeEngine: CRUDEngine = (core as any).storeEngine;
      if (storeEngine instanceof SQLeetEngine) {
        await (core as any).storeEngine.save();
      }
    };
  };

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
  ): ThunkAction => {
    const onBeforeLogin: LoginLifecycleFunction = async (dispatch, getState, {actions: {authAction}}) =>
      dispatch(authAction.doSilentLogout());
    const onAfterLogin: LoginLifecycleFunction = async (
      dispatch,
      getState,
      {actions: {localStorageAction, conversationAction}},
    ) => {
      const conversation = await dispatch(conversationAction.doJoinConversationByCode(key, code, uri));
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
        actions: {clientAction, cookieAction, selfAction, localStorageAction},
      } = global;
      dispatch(AuthActionCreator.startLogin());
      try {
        await onBeforeLogin(dispatch, getState, global);
        await core.login(loginData, false, clientAction.generateClientPayload(loginData.clientType));
        await this.persistClientData(loginData.clientType, dispatch, localStorageAction);
        await dispatch(
          cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: global.getConfig().APP_INSTANCE_ID}),
        );
        await dispatch(selfAction.fetchSelf());
        let entropyData: Uint8Array | undefined = undefined;
        if (getEntropy) {
          try {
            await core.loadAndValidateLocalClient();
          } catch (e) {
            entropyData = await getEntropy();
          }
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
        if (error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          if (error instanceof LowDiskSpaceError) {
            error = new LabeledError(LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE, error);
          }
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw error;
      }
    };
  };

  doSendPhoneLoginCode = (loginRequest: Omit<SendLoginCode, 'voice_call'>): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      dispatch(AuthActionCreator.startSendPhoneLoginCode());
      try {
        const {expires_in} = await apiClient.api.auth.postLoginSend(loginRequest);
        dispatch(AuthActionCreator.successfulSendPhoneLoginCode(expires_in));
      } catch (error) {
        dispatch(AuthActionCreator.failedSendPhoneLoginCode(error));
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
        dispatch(AuthActionCreator.failedSendTwoFactorCode(error));
        throw error;
      }
    };
  };

  doFinalizeSSOLogin = ({clientType}: {clientType: ClientType}): ThunkAction => {
    return async (
      dispatch,
      getState,
      {getConfig, core, actions: {cookieAction, clientAction, selfAction, localStorageAction}},
    ) => {
      dispatch(AuthActionCreator.startLogin());
      try {
        // we first init the core without initializing the client for now (this will be done later on)
        await core.init(clientType, {initClient: false});
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(selfAction.fetchSelf());
        await dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: getConfig().APP_INSTANCE_ID}));
        await dispatch(clientAction.doInitializeClient(clientType));
        dispatch(AuthActionCreator.successfulLogin());
      } catch (error) {
        if (error.label === BackendError.LABEL.TOO_MANY_CLIENTS) {
          dispatch(AuthActionCreator.successfulLogin());
        } else {
          dispatch(AuthActionCreator.failedLogin(error));
        }
        throw error;
      }
    };
  };

  validateSSOCode = (code: string): ThunkAction => {
    return async (dispatch, getState, {apiClient}) => {
      const mapError = (error: any) => {
        const statusCode = error?.response?.status;
        if (statusCode === HTTP_STATUS.NOT_FOUND) {
          return new BackendError({code: HTTP_STATUS.NOT_FOUND, label: BackendError.SSO_ERRORS.SSO_NOT_FOUND});
        }
        if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
          return new BackendError({
            code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
            label: BackendError.SSO_ERRORS.SSO_SERVER_ERROR,
          });
        }
        return new BackendError({
          code: HTTP_STATUS.INTERNAL_SERVER_ERROR,
          label: BackendError.SSO_ERRORS.SSO_GENERIC_ERROR,
        });
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

  pushLoginData = (loginData: Partial<LoginData>): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.pushLoginData(loginData));
    };
  };

  pushEntropyData = (entropy: Uint8Array): ThunkAction => {
    return async dispatch => {
      dispatch(AuthActionCreator.pushEntropyData(entropy));
    };
  };

  doRegisterTeam = (registration: RegisterData): ThunkAction => {
    return async (
      dispatch,
      getState,
      {getConfig, core, actions: {cookieAction, clientAction, selfAction, localStorageAction}},
    ) => {
      const clientType = ClientType.PERMANENT;
      registration.locale = currentLanguage();
      registration.name = registration.name.trim();
      registration.email = registration.email.trim();
      registration.team.icon = 'default';
      registration.team.currency = currentCurrency();
      registration.team.name = registration.team.name.trim();

      dispatch(AuthActionCreator.startRegisterTeam());
      try {
        await dispatch(this.doSilentLogout());
        await core.register(registration, clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: getConfig().APP_INSTANCE_ID}));
        await dispatch(selfAction.fetchSelf());
        await dispatch(clientAction.doInitializeClient(clientType));
        dispatch(AuthActionCreator.successfulRegisterTeam(registration));
      } catch (error) {
        dispatch(AuthActionCreator.failedRegisterTeam(error));
        throw error;
      }
    };
  };

  doRegisterPersonal = (registration: RegisterData, entropyData: Uint8Array): ThunkAction => {
    return async (
      dispatch,
      getState,
      {getConfig, core, actions: {authAction, clientAction, cookieAction, selfAction, localStorageAction}},
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
        await dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: getConfig().APP_INSTANCE_ID}));
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
      {getConfig, core, actions: {authAction, cookieAction, clientAction, selfAction, localStorageAction}},
    ) => {
      const clientType = options.shouldInitializeClient ? ClientType.TEMPORARY : ClientType.NONE;
      registrationData.locale = currentLanguage();
      registrationData.name = registrationData.name.trim();

      dispatch(AuthActionCreator.startRegisterWireless());
      try {
        await dispatch(authAction.doSilentLogout());
        await core.register(registrationData, clientType);
        await this.persistClientData(clientType, dispatch, localStorageAction);
        await dispatch(cookieAction.setCookie(COOKIE_NAME_APP_OPENED, {appInstanceId: getConfig().APP_INSTANCE_ID}));
        await dispatch(selfAction.fetchSelf());
        await (clientType !== ClientType.NONE &&
          dispatch(clientAction.doInitializeClient(clientType, undefined, undefined, entropyData)));
        await dispatch(authAction.doFlushDatabase());
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

        await core.init(clientType, {initClient: false});
        await this.persistClientData(clientType, dispatch, localStorageAction);

        if (options.shouldValidateLocalClient) {
          await dispatch(authAction.validateLocalClient());
        }

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

  validateLocalClient = (): ThunkAction => {
    return async (dispatch, getState, {core}) => {
      dispatch(AuthActionCreator.startValidateLocalClient());
      try {
        await core.loadAndValidateLocalClient();
        dispatch(AuthActionCreator.successfulValidateLocalClient());
      } catch (error) {
        dispatch(AuthActionCreator.failedValidateLocalClient(error));
        throw error;
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
    return async (dispatch, getState, {getConfig, core, actions: {cookieAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startLogout());
      try {
        await core.logout();
        if (isTemporaryClientAndNonPersistent(false)) {
          /**
           * WEBAPP-6804: Our current implementation of "websql" has the drawback that a mounted database can only get unmounted by refreshing the page.
           * @see https://github.com/wireapp/websql/blob/v0.0.15/packages/worker/src/Database.ts#L142-L145
           */
          window.location.reload();
        }
        await dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, getConfig().APP_INSTANCE_ID));
        dispatch(AuthActionCreator.successfulLogout());
      } catch (error) {
        dispatch(AuthActionCreator.failedLogout(error));
      }
    };
  };

  doSilentLogout = (): ThunkAction => {
    return async (dispatch, getState, {getConfig, core, actions: {cookieAction, localStorageAction}}) => {
      dispatch(AuthActionCreator.startLogout());
      try {
        await core.logout();
        await dispatch(cookieAction.safelyRemoveCookie(COOKIE_NAME_APP_OPENED, getConfig().APP_INSTANCE_ID));
        dispatch(AuthActionCreator.successfulSilentLogout());
      } catch (error) {
        dispatch(AuthActionCreator.failedLogout(error));
      }
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
