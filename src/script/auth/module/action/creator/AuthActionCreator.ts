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

import type {SSOSettings} from '@wireapp/api-client/src/account/SSOSettings';
import type {LoginData, RegisterData} from '@wireapp/api-client/src/auth';

import type {AppAction} from '.';
import type {RegistrationDataState} from '../../reducer/authReducer';

export enum AUTH_ACTION {
  AUTH_RESET_ERROR = 'AUTH_RESET_ERROR',
  ENTER_GENERIC_INVITATION_FLOW = 'ENTER_GENERIC_INVITATION_FLOW',
  ENTER_PERSONAL_CREATION_FLOW = 'ENTER_PERSONAL_CREATION_FLOW',
  ENTER_PERSONAL_INVITATION_FLOW = 'ENTER_PERSONAL_INVITATION_FLOW',
  ENTER_TEAM_CREATION_FLOW = 'ENTER_TEAM_CREATION_FLOW',
  GET_INVITATION_FROM_CODE_FAILED = 'GET_INVITATION_FROM_CODE_FAILED',
  GET_INVITATION_FROM_CODE_START = 'GET_INVITATION_FROM_CODE_START',
  GET_INVITATION_FROM_CODE_SUCCESS = 'GET_INVITATION_FROM_CODE_SUCCESS',
  GET_SSO_SETTINGS_FAILED = 'GET_SSO_SETTINGS_FAILED',
  GET_SSO_SETTINGS_START = 'GET_SSO_SETTINGS_START',
  GET_SSO_SETTINGS_SUCCESS = 'GET_SSO_SETTINGS_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  LOGOUT_START = 'LOGOUT_START',
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
  REGISTER_RESET_ACCOUNT_DATA = 'REGISTER_RESET_ACCOUNT_DATA',
  REGISTER_TEAM_FAILED = 'REGISTER_TEAM_FAILED',
  REGISTER_TEAM_START = 'REGISTER_TEAM_START',
  REGISTER_TEAM_SUCCESS = 'REGISTER_TEAM_SUCCESS',
  REGISTER_WIRELESS_FAILED = 'REGISTER_WIRELESS_FAILED',
  REGISTER_WIRELESS_START = 'REGISTER_WIRELESS_START',
  REGISTER_WIRELESS_SUCCESS = 'REGISTER_WIRELESS_SUCCESS',
  RESET_LOGIN_DATA = 'RESET_LOGIN_DATA',
  SEND_PHONE_LOGIN_CODE_FAILED = 'SEND_PHONE_LOGIN_CODE_FAILED',
  SEND_PHONE_LOGIN_CODE_START = 'SEND_PHONE_LOGIN_CODE_START',
  SEND_PHONE_LOGIN_CODE_SUCCESS = 'SEND_PHONE_LOGIN_CODE_SUCCESS',
  SILENT_LOGOUT_FAILED = 'SILENT_LOGOUT_FAILED',
  SILENT_LOGOUT_SUCCESS = 'SILENT_LOGOUT_SUCCESS',
  VALIDATE_LOCAL_CLIENT_FAILED = 'VALIDATE_LOCAL_CLIENT_FAILED',
  VALIDATE_LOCAL_CLIENT_START = 'VALIDATE_LOCAL_CLIENT_START',
  VALIDATE_LOCAL_CLIENT_SUCCESS = 'VALIDATE_LOCAL_CLIENT_SUCCESS',
}

export type AuthActions =
  | LoginStartAction
  | LoginSuccessAction
  | LoginFailedAction
  | SendPhoneLoginCodeStartAction
  | SendPhoneLoginCodeSuccessAction
  | SendPhoneLoginCodeFailedAction
  | RegisterTeamStartAction
  | RegisterTeamSuccessAction
  | RegisterTeamFailedAction
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
  | ValidateClientStartAction
  | ValidateClientSuccessAction
  | ValidateClientFailedAction
  | GetSSOSettingsStartAction
  | GetSSOSettingsSuccessAction
  | GetSSOSettingsFailedAction
  | LogoutStartAction
  | LogoutSuccessAction
  | LogoutFailedAction
  | LogoutSilentSuccessAction
  | LogoutSilentFailedAction
  | ResetAuthErrorsAction
  | ResetRegistrationDataAction
  | PushRegistrationDataAction
  | ResetLoginDataAction
  | PushLoginDataAction
  | EnterTeamCreationFlowAction
  | EnterPersonalCreationFlowAction
  | EnterGenericInvitationCreationFlowAction;

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

export interface SendPhoneLoginCodeStartAction extends AppAction {
  readonly type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_START;
}
export interface SendPhoneLoginCodeSuccessAction extends AppAction {
  readonly payload: {
    expiresIn: number;
  };
  readonly type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_SUCCESS;
}
export interface SendPhoneLoginCodeFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_FAILED;
}

export interface RegisterTeamStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_TEAM_START;
}
export interface RegisterTeamSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_TEAM_SUCCESS;
}
export interface RegisterTeamFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.REGISTER_TEAM_FAILED;
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

export interface ValidateClientStartAction extends AppAction {
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_START;
}
export interface ValidateClientSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_SUCCESS;
}
export interface ValidateClientFailedAction extends AppAction {
  readonly error: Error;
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_FAILED;
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

export interface LogoutStartAction extends AppAction {
  readonly type: AUTH_ACTION.LOGOUT_START;
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

export interface ResetLoginDataAction extends AppAction {
  readonly type: AUTH_ACTION.RESET_LOGIN_DATA;
}
export interface PushLoginDataAction extends AppAction {
  readonly payload: Partial<LoginData>;
  readonly type: AUTH_ACTION.PUSH_LOGIN_DATA;
}

export interface EnterTeamCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_TEAM_CREATION_FLOW;
}
export interface EnterPersonalCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_PERSONAL_CREATION_FLOW;
}
export interface EnterGenericInvitationCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_GENERIC_INVITATION_FLOW;
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

  static startSendPhoneLoginCode = (): SendPhoneLoginCodeStartAction => ({
    type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_START,
  });

  static successfulSendPhoneLoginCode = (expiresIn: number): SendPhoneLoginCodeSuccessAction => ({
    payload: {expiresIn},
    type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_SUCCESS,
  });

  static failedSendPhoneLoginCode = (error: Error): SendPhoneLoginCodeFailedAction => ({
    error,
    type: AUTH_ACTION.SEND_PHONE_LOGIN_CODE_FAILED,
  });

  static startRegisterTeam = (): RegisterTeamStartAction => ({
    type: AUTH_ACTION.REGISTER_TEAM_START,
  });

  static successfulRegisterTeam = (authData: RegisterData): RegisterTeamSuccessAction => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_TEAM_SUCCESS,
  });

  static failedRegisterTeam = (error: Error): RegisterTeamFailedAction => ({
    error,
    type: AUTH_ACTION.REGISTER_TEAM_FAILED,
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

  static startValidateLocalClient = (): ValidateClientStartAction => ({
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_START,
  });

  static successfulValidateLocalClient = (): ValidateClientSuccessAction => ({
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_SUCCESS,
  });

  static failedValidateLocalClient = (error: Error): ValidateClientFailedAction => ({
    error,
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_FAILED,
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

  static startLogout = (): LogoutStartAction => ({
    type: AUTH_ACTION.LOGOUT_START,
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

  static pushLoginData = (loginData: Partial<LoginData>): PushLoginDataAction => ({
    payload: loginData,
    type: AUTH_ACTION.PUSH_LOGIN_DATA,
  });

  static resetLoginData = (): ResetLoginDataAction => ({
    type: AUTH_ACTION.RESET_LOGIN_DATA,
  });

  static enterTeamCreationFlow = (): EnterTeamCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_TEAM_CREATION_FLOW,
  });

  static enterPersonalCreationFlow = (): EnterPersonalCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_PERSONAL_CREATION_FLOW,
  });

  static enterGenericInviteCreationFlow = (): EnterGenericInvitationCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_GENERIC_INVITATION_FLOW,
  });
}
