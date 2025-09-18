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

import type {SSOSettings} from '@wireapp/api-client/lib/account/SSOSettings';
import type {RegisterData} from '@wireapp/api-client/lib/auth/';
import {OAuthClient} from '@wireapp/api-client/lib/oauth/OAuthClient';
import {TeamData} from '@wireapp/api-client/lib/team';

import type {LoginDataState, RegistrationDataState} from '../../reducer/authReducer';

import type {AppAction} from '.';

export enum AUTH_ACTION {
  AUTH_RESET_ERROR = 'AUTH_RESET_ERROR',
  FETCH_TEAM_FAILED = 'FETCH_TEAM_FAILED',
  FETCH_TEAM_START = 'FETCH_TEAM_START',
  FETCH_TEAM_SUCCESS = 'FETCH_TEAM_SUCCESS',
  FETCH_OAUTH_APP_FAILED = 'FETCH_OAUTH_APP_FAILED',
  FETCH_OAUTH_APP_START = 'FETCH_OAUTH_APP_START',
  FETCH_OAUTH_APP_SUCCESS = 'FETCH_OAUTH_APP_SUCCESS',
  GET_SSO_SETTINGS_FAILED = 'GET_SSO_SETTINGS_FAILED',
  GET_SSO_SETTINGS_START = 'GET_SSO_SETTINGS_START',
  GET_SSO_SETTINGS_SUCCESS = 'GET_SSO_SETTINGS_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  PUSH_LOGIN_DATA = 'PUSH_LOGIN_DATA',
  REFRESH_FAILED = 'REFRESH_FAILED',
  REFRESH_START = 'REFRESH_START',
  REFRESH_SUCCESS = 'REFRESH_SUCCESS',
  REGISTER_JOIN_FAILED = 'REGISTER_JOIN_FAILED',
  REGISTER_JOIN_START = 'REGISTER_JOIN_START',
  REGISTER_JOIN_SUCCESS = 'REGISTER_JOIN_SUCCESS',
  REGISTER_PERSONAL_FAILED = 'REGISTER_PERSONAL_FAILED',
  REGISTER_PERSONAL_START = 'REGISTER_PERSONAL_START',
  REGISTER_PERSONAL_SUCCESS = 'REGISTER_PERSONAL_SUCCESS',
  REGISTER_PUSH_ACCOUNT_DATA = 'REGISTER_PUSH_ACCOUNT_DATA',
  REGISTER_PUSH_ENTROPY_DATA = 'REGISTER_PUSH_ENTROPY_DATA',
  REGISTER_RESET_ACCOUNT_DATA = 'REGISTER_RESET_ACCOUNT_DATA',
  REGISTER_WIRELESS_FAILED = 'REGISTER_WIRELESS_FAILED',
  REGISTER_WIRELESS_START = 'REGISTER_WIRELESS_START',
  REGISTER_WIRELESS_SUCCESS = 'REGISTER_WIRELESS_SUCCESS',
  RESET_LOGIN_DATA = 'RESET_LOGIN_DATA',
  SEND_OAUTH_CODE_FAILED = 'SEND_OAUTH_CODE_FAILED',
  SEND_OAUTH_CODE_START = 'SEND_OAUTH_CODE_START',
  SEND_OAUTH_CODE_SUCCESS = 'SEND_OAUTH_CODE_SUCCESS',
  SEND_TWO_FACTOR_CODE_FAILED = 'SEND_TWO_FACTOR_CODE_FAILED',
  SEND_TWO_FACTOR_CODE_START = 'SEND_TWO_FACTOR_CODE_START',
  SEND_TWO_FACTOR_CODE_SUCCESS = 'SEND_TWO_FACTOR_CODE_SUCCESS',
  SILENT_LOGOUT_FAILED = 'SILENT_LOGOUT_FAILED',
  SILENT_LOGOUT_SUCCESS = 'SILENT_LOGOUT_SUCCESS',
}

export type AuthActions =
  | LoginStartAction
  | LoginSuccessAction
  | LoginFailedAction
  | SendTwoFactorCodeStartAction
  | SendTwoFactorCodeSuccessAction
  | SendTwoFactorCodeFailedAction
  | SendOAuthCodeStartAction
  | SendOAuthCodeSuccessAction
  | SendOAuthCodeFailedAction
  | FetchTeamStartAction
  | FetchTeamSuccessAction
  | FetchTeamFailedAction
  | FetchApplicationStartAction
  | FetchApplicationSuccessAction
  | FetchApplicationFailedAction
  | RegisterPersonalStartAction
  | RegisterPersonalSuccessAction
  | RegisterPersonalFailedAction
  | RegisterWirelessStartAction
  | RegisterWirelessSuccessAction
  | RegisterWirelessFailedAction
  | RegisterJoinStartAction
  | RegisterJoinSuccessAction
  | RegisterJoinFailedAction
  | RefreshStartAction
  | RefreshSuccessAction
  | RefreshFailedAction
  | GetSSOSettingsStartAction
  | GetSSOSettingsSuccessAction
  | GetSSOSettingsFailedAction
  | LogoutSuccessAction
  | LogoutFailedAction
  | LogoutSilentSuccessAction
  | LogoutSilentFailedAction
  | ResetAuthErrorsAction
  | ResetRegistrationDataAction
  | PushRegistrationDataAction
  | PushEntropyDataAction
  | ResetLoginDataAction
  | PushLoginDataAction;

export interface LoginStartAction extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_START;
}
export interface LoginSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_SUCCESS;
}
export interface LoginFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.LOGIN_FAILED;
}

export interface SendOAuthCodeStartAction extends AppAction {
  readonly type: AUTH_ACTION.SEND_OAUTH_CODE_START;
}
export interface SendOAuthCodeSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.SEND_OAUTH_CODE_SUCCESS;
}
export interface SendOAuthCodeFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.SEND_OAUTH_CODE_FAILED;
}

export interface SendTwoFactorCodeStartAction extends AppAction {
  readonly type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_START;
}
export interface SendTwoFactorCodeSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_SUCCESS;
}
export interface SendTwoFactorCodeFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_FAILED;
}

export interface FetchTeamStartAction extends AppAction {
  readonly type: AUTH_ACTION.FETCH_TEAM_START;
}
export interface FetchTeamSuccessAction extends AppAction {
  readonly payload: TeamData;
  readonly type: AUTH_ACTION.FETCH_TEAM_SUCCESS;
}
export interface FetchTeamFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.FETCH_TEAM_FAILED;
}

export interface FetchApplicationStartAction extends AppAction {
  readonly type: AUTH_ACTION.FETCH_OAUTH_APP_START;
}
export interface FetchApplicationSuccessAction extends AppAction {
  readonly payload: OAuthClient;
  readonly type: AUTH_ACTION.FETCH_OAUTH_APP_SUCCESS;
}
export interface FetchApplicationFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.FETCH_OAUTH_APP_FAILED;
}

export interface RegisterPersonalStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_START;
}
export interface RegisterPersonalSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_SUCCESS;
}
export interface RegisterPersonalFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_FAILED;
}

export interface RegisterWirelessStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_START;
}
export interface RegisterWirelessSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_SUCCESS;
}
export interface RegisterWirelessFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_FAILED;
}

export interface RegisterJoinStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_JOIN_START;
}
export interface RegisterJoinSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_JOIN_SUCCESS;
}
export interface RegisterJoinFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.REGISTER_JOIN_FAILED;
}

export interface RefreshStartAction extends AppAction {
  readonly type: AUTH_ACTION.REFRESH_START;
}
export interface RefreshSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.REFRESH_SUCCESS;
}
export interface RefreshFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.REFRESH_FAILED;
}

export interface GetSSOSettingsStartAction extends AppAction {
  readonly type: AUTH_ACTION.GET_SSO_SETTINGS_START;
}
export interface GetSSOSettingsSuccessAction extends AppAction {
  readonly payload: SSOSettings;
  readonly type: AUTH_ACTION.GET_SSO_SETTINGS_SUCCESS;
}
export interface GetSSOSettingsFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.GET_SSO_SETTINGS_FAILED;
}

export interface LogoutSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.LOGOUT_SUCCESS;
}
export interface LogoutFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.LOGOUT_FAILED;
}

export interface LogoutSilentSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.SILENT_LOGOUT_SUCCESS;
}
export interface LogoutSilentFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.SILENT_LOGOUT_FAILED;
}

export interface ResetAuthErrorsAction extends AppAction {
  readonly type: AUTH_ACTION.AUTH_RESET_ERROR;
}

export interface ResetRegistrationDataAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_RESET_ACCOUNT_DATA;
}
export interface PushRegistrationDataAction extends AppAction {
  readonly payload: Partial<RegistrationDataState>;
  readonly type: AUTH_ACTION.REGISTER_PUSH_ACCOUNT_DATA;
}

export interface PushEntropyDataAction extends AppAction {
  readonly payload: Uint8Array;
  readonly type: AUTH_ACTION.REGISTER_PUSH_ENTROPY_DATA;
}
export interface ResetLoginDataAction extends AppAction {
  readonly type: AUTH_ACTION.RESET_LOGIN_DATA;
}
export interface PushLoginDataAction extends AppAction {
  readonly payload: Partial<LoginDataState>;
  readonly type: AUTH_ACTION.PUSH_LOGIN_DATA;
}
export class AuthActionCreator {
  static startLogin = (): LoginStartAction => ({
    type: AUTH_ACTION.LOGIN_START,
  });

  static successfulLogin = (): LoginSuccessAction => ({
    type: AUTH_ACTION.LOGIN_SUCCESS,
  });

  static failedLogin = (error: Error): LoginFailedAction => ({
    error,
    type: AUTH_ACTION.LOGIN_FAILED,
  });

  static startSendOAuthCode = (): SendOAuthCodeStartAction => ({
    type: AUTH_ACTION.SEND_OAUTH_CODE_START,
  });

  static successfulSendOAuthCode = (): SendOAuthCodeSuccessAction => ({
    type: AUTH_ACTION.SEND_OAUTH_CODE_SUCCESS,
  });

  static failedSendOAuthCode = (error: Error): SendOAuthCodeFailedAction => ({
    error,
    type: AUTH_ACTION.SEND_OAUTH_CODE_FAILED,
  });

  static startSendTwoFactorCode = (): SendTwoFactorCodeStartAction => ({
    type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_START,
  });

  static successfulSendTwoFactorCode = (): SendTwoFactorCodeSuccessAction => ({
    type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_SUCCESS,
  });

  static failedSendTwoFactorCode = (error: Error): SendTwoFactorCodeFailedAction => ({
    error,
    type: AUTH_ACTION.SEND_TWO_FACTOR_CODE_FAILED,
  });

  static startFetchTeam = (): FetchTeamStartAction => ({
    type: AUTH_ACTION.FETCH_TEAM_START,
  });

  static successfulFetchTeam = (teamData: TeamData): FetchTeamSuccessAction => ({
    payload: teamData,
    type: AUTH_ACTION.FETCH_TEAM_SUCCESS,
  });

  static failedFetchTeam = (error: Error): FetchTeamFailedAction => ({
    error,
    type: AUTH_ACTION.FETCH_TEAM_FAILED,
  });
  static startFetchOAuth = (): FetchApplicationStartAction => ({
    type: AUTH_ACTION.FETCH_OAUTH_APP_START,
  });

  static successfulFetchOAuth = (application: OAuthClient): FetchApplicationSuccessAction => ({
    payload: application,
    type: AUTH_ACTION.FETCH_OAUTH_APP_SUCCESS,
  });

  static failedFetchOAuth = (error: Error): FetchApplicationFailedAction => ({
    error,
    type: AUTH_ACTION.FETCH_OAUTH_APP_FAILED,
  });

  static startRegisterPersonal = (): RegisterPersonalStartAction => ({
    type: AUTH_ACTION.REGISTER_PERSONAL_START,
  });

  static successfulRegisterPersonal = (authData: RegisterData): RegisterPersonalSuccessAction => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_PERSONAL_SUCCESS,
  });

  static failedRegisterPersonal = (error: Error): RegisterPersonalFailedAction => ({
    error,
    type: AUTH_ACTION.REGISTER_PERSONAL_FAILED,
  });

  static startRegisterWireless = (): RegisterWirelessStartAction => ({
    type: AUTH_ACTION.REGISTER_WIRELESS_START,
  });

  static successfulRegisterWireless = (authData: RegisterData): RegisterWirelessSuccessAction => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_WIRELESS_SUCCESS,
  });

  static failedRegisterWireless = (error: Error): RegisterWirelessFailedAction => ({
    error,
    type: AUTH_ACTION.REGISTER_WIRELESS_FAILED,
  });

  static startRegisterJoin = (): RegisterJoinStartAction => ({
    type: AUTH_ACTION.REGISTER_JOIN_START,
  });

  static successfulRegisterJoin = (authData: RegisterData): RegisterJoinSuccessAction => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_JOIN_SUCCESS,
  });

  static failedRegisterJoin = (error: Error): RegisterJoinFailedAction => ({
    error,
    type: AUTH_ACTION.REGISTER_JOIN_FAILED,
  });

  static startRefresh = (): RefreshStartAction => ({
    type: AUTH_ACTION.REFRESH_START,
  });

  static successfulRefresh = (): RefreshSuccessAction => ({
    type: AUTH_ACTION.REFRESH_SUCCESS,
  });

  static failedRefresh = (error: Error): RefreshFailedAction => ({
    error,
    type: AUTH_ACTION.REFRESH_FAILED,
  });

  static startGetSSOSettings = (): GetSSOSettingsStartAction => ({
    type: AUTH_ACTION.GET_SSO_SETTINGS_START,
  });

  static successfulGetSSOSettings = (ssoSettings: SSOSettings): GetSSOSettingsSuccessAction => ({
    payload: ssoSettings,
    type: AUTH_ACTION.GET_SSO_SETTINGS_SUCCESS,
  });

  static failedGetSSOSettings = (error: Error): GetSSOSettingsFailedAction => ({
    error,
    type: AUTH_ACTION.GET_SSO_SETTINGS_FAILED,
  });

  static successfulLogout = (): LogoutSuccessAction => ({
    type: AUTH_ACTION.LOGOUT_SUCCESS,
  });

  static failedLogout = (error: Error): LogoutFailedAction => ({
    error,
    type: AUTH_ACTION.LOGOUT_FAILED,
  });

  static successfulSilentLogout = (): LogoutSilentSuccessAction => ({
    type: AUTH_ACTION.SILENT_LOGOUT_SUCCESS,
  });

  static failedSilentLogout = (error: Error): LogoutSilentFailedAction => ({
    error,
    type: AUTH_ACTION.SILENT_LOGOUT_FAILED,
  });

  static resetError = (): ResetAuthErrorsAction => ({
    type: AUTH_ACTION.AUTH_RESET_ERROR,
  });

  static resetAccountData = (): ResetRegistrationDataAction => ({
    type: AUTH_ACTION.REGISTER_RESET_ACCOUNT_DATA,
  });

  static pushAccountRegistrationData = (accountData: Partial<RegistrationDataState>): PushRegistrationDataAction => ({
    payload: accountData,
    type: AUTH_ACTION.REGISTER_PUSH_ACCOUNT_DATA,
  });

  static pushEntropyData = (entropy: Uint8Array): PushEntropyDataAction => {
    return {
      payload: entropy,
      type: AUTH_ACTION.REGISTER_PUSH_ENTROPY_DATA,
    };
  };

  static pushLoginData = (loginData: Partial<LoginDataState>): PushLoginDataAction => ({
    payload: loginData,
    type: AUTH_ACTION.PUSH_LOGIN_DATA,
  });

  static resetLoginData = (): ResetLoginDataAction => ({
    type: AUTH_ACTION.RESET_LOGIN_DATA,
  });
}
