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

import {RegisterData} from '@wireapp/api-client/dist/commonjs/auth';
import {Invitation} from '@wireapp/api-client/dist/commonjs/invitation';
import {AppAction} from '.';
import {RegistrationDataState} from '../../reducer/authReducer';

export enum AUTH_ACTION {
  LOGIN_START = 'LOGIN_START',
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',

  REGISTER_PUSH_ACCOUNT_DATA = 'REGISTER_PUSH_ACCOUNT_DATA',
  REGISTER_RESET_ACCOUNT_DATA = 'REGISTER_RESET_ACCOUNT_DATA',

  REGISTER_TEAM_START = 'REGISTER_TEAM_START',
  REGISTER_TEAM_SUCCESS = 'REGISTER_TEAM_SUCCESS',
  REGISTER_TEAM_FAILED = 'REGISTER_TEAM_FAILED',

  REGISTER_PERSONAL_START = 'REGISTER_PERSONAL_START',
  REGISTER_PERSONAL_SUCCESS = 'REGISTER_PERSONAL_SUCCESS',
  REGISTER_PERSONAL_FAILED = 'REGISTER_PERSONAL_FAILED',

  REGISTER_WIRELESS_START = 'REGISTER_WIRELESS_START',
  REGISTER_WIRELESS_SUCCESS = 'REGISTER_WIRELESS_SUCCESS',
  REGISTER_WIRELESS_FAILED = 'REGISTER_WIRELESS_FAILED',

  REGISTER_JOIN_START = 'REGISTER_JOIN_START',
  REGISTER_JOIN_SUCCESS = 'REGISTER_JOIN_SUCCESS',
  REGISTER_JOIN_FAILED = 'REGISTER_JOIN_FAILED',

  LOGOUT_START = 'LOGOUT_START',
  LOGOUT_SUCCESS = 'LOGOUT_SUCCESS',
  LOGOUT_FAILED = 'LOGOUT_FAILED',
  SILENT_LOGOUT_SUCCESS = 'SILENT_LOGOUT_SUCCESS',
  SILENT_LOGOUT_FAILED = 'SILENT_LOGOUT_FAILED',

  REFRESH_START = 'REFRESH_START',
  REFRESH_SUCCESS = 'REFRESH_SUCCESS',
  REFRESH_FAILED = 'REFRESH_FAILED',

  VALIDATE_LOCAL_CLIENT_START = 'VALIDATE_LOCAL_CLIENT_START',
  VALIDATE_LOCAL_CLIENT_SUCCESS = 'VALIDATE_LOCAL_CLIENT_SUCCESS',
  VALIDATE_LOCAL_CLIENT_FAILED = 'VALIDATE_LOCAL_CLIENT_FAILED',

  GET_INVITATION_FROM_CODE_START = 'GET_INVITATION_FROM_CODE_START',
  GET_INVITATION_FROM_CODE_SUCCESS = 'GET_INVITATION_FROM_CODE_SUCCESS',
  GET_INVITATION_FROM_CODE_FAILED = 'GET_INVITATION_FROM_CODE_FAILED',

  AUTH_RESET_ERROR = 'AUTH_RESET_ERROR',

  ENTER_TEAM_CREATION_FLOW = 'ENTER_TEAM_CREATION_FLOW',
  ENTER_PERSONAL_CREATION_FLOW = 'ENTER_PERSONAL_CREATION_FLOW',
  ENTER_GENERIC_INVITATION_FLOW = 'ENTER_GENERIC_INVITATION_FLOW',
  ENTER_PERSONAL_INVITATION_FLOW = 'ENTER_PERSONAL_INVITATION_FLOW',
}

export type AuthActions =
  | LoginStartAction
  | LoginSuccessAction
  | LoginFailedAction
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
  | LogoutStartAction
  | LogoutSuccessAction
  | LogoutFailedAction
  | LogoutSilentSuccessAction
  | LogoutSilentFailedAction
  | ResetAuthErrorsAction
  | ResetRegistrationDataAction
  | PushRegistrationDataAction
  | EnterTeamCreationFlowAction
  | EnterPersonalCreationFlowAction
  | EnterGenericInvitationCreationFlowAction
  | EnterPersonalInvitationCreationFlowAction
  | GetInvitationFromCodeStartAction
  | GetInvitationFromCodeSuccessAction
  | GetInvitationFromCodeFailedAction;

export interface LoginStartAction extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_START;
}
export interface LoginSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_SUCCESS;
}
export interface LoginFailedAction extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_FAILED;
  readonly error: Error;
}

export interface RegisterTeamStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_TEAM_START;
}
export interface RegisterTeamSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_TEAM_SUCCESS;
}
export interface RegisterTeamFailedAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_TEAM_FAILED;
  readonly error: Error;
}

export interface RegisterPersonalStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_START;
}
export interface RegisterPersonalSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_SUCCESS;
}
export interface RegisterPersonalFailedAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_PERSONAL_FAILED;
  readonly error: Error;
}

export interface RegisterWirelessStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_START;
}
export interface RegisterWirelessSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_SUCCESS;
}
export interface RegisterWirelessFailedAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_WIRELESS_FAILED;
  readonly error: Error;
}

export interface RegisterJoinStartAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_JOIN_START;
}
export interface RegisterJoinSuccessAction extends AppAction {
  readonly payload: RegisterData;
  readonly type: AUTH_ACTION.REGISTER_JOIN_SUCCESS;
}
export interface RegisterJoinFailedAction extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_JOIN_FAILED;
  readonly error: Error;
}

export interface RefreshStartAction extends AppAction {
  readonly type: AUTH_ACTION.REFRESH_START;
}
export interface RefreshSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.REFRESH_SUCCESS;
}
export interface RefreshFailedAction extends AppAction {
  readonly type: AUTH_ACTION.REFRESH_FAILED;
  readonly error: Error;
}

export interface ValidateClientStartAction extends AppAction {
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_START;
}
export interface ValidateClientSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_SUCCESS;
}
export interface ValidateClientFailedAction extends AppAction {
  readonly type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_FAILED;
  readonly error: Error;
}

export interface LogoutStartAction extends AppAction {
  readonly type: AUTH_ACTION.LOGOUT_START;
}
export interface LogoutSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.LOGOUT_SUCCESS;
}
export interface LogoutFailedAction extends AppAction {
  readonly type: AUTH_ACTION.LOGOUT_FAILED;
  readonly error: Error;
}

export interface LogoutSilentSuccessAction extends AppAction {
  readonly type: AUTH_ACTION.SILENT_LOGOUT_SUCCESS;
}
export interface LogoutSilentFailedAction extends AppAction {
  readonly type: AUTH_ACTION.SILENT_LOGOUT_FAILED;
  readonly error: Error;
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

export interface EnterTeamCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_TEAM_CREATION_FLOW;
}
export interface EnterPersonalCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_PERSONAL_CREATION_FLOW;
}
export interface EnterGenericInvitationCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_GENERIC_INVITATION_FLOW;
}
export interface EnterPersonalInvitationCreationFlowAction extends AppAction {
  readonly type: AUTH_ACTION.ENTER_PERSONAL_INVITATION_FLOW;
}

export interface GetInvitationFromCodeStartAction extends AppAction {
  readonly type: AUTH_ACTION.GET_INVITATION_FROM_CODE_START;
}
export interface GetInvitationFromCodeSuccessAction extends AppAction {
  readonly payload: Invitation;
  readonly type: AUTH_ACTION.GET_INVITATION_FROM_CODE_SUCCESS;
}
export interface GetInvitationFromCodeFailedAction extends AppAction {
  readonly type: AUTH_ACTION.GET_INVITATION_FROM_CODE_FAILED;
  readonly error: Error;
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

  static enterTeamCreationFlow = (): EnterTeamCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_TEAM_CREATION_FLOW,
  });
  static enterPersonalCreationFlow = (): EnterPersonalCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_PERSONAL_CREATION_FLOW,
  });
  static enterGenericInviteCreationFlow = (): EnterGenericInvitationCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_GENERIC_INVITATION_FLOW,
  });
  static enterPersonalInvitationCreationFlow = (): EnterPersonalInvitationCreationFlowAction => ({
    type: AUTH_ACTION.ENTER_PERSONAL_INVITATION_FLOW,
  });

  static startGetInvitationFromCode = (): GetInvitationFromCodeStartAction => ({
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_START,
  });
  static successfulGetInvitationFromCode = (invitation: Invitation): GetInvitationFromCodeSuccessAction => ({
    payload: invitation,
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_SUCCESS,
  });
  static failedGetInvitationFromCode = (error: Error): GetInvitationFromCodeFailedAction => ({
    error,
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_FAILED,
  });
}
