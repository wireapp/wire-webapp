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

import {AppAction} from ".";
import {RegisterData, Context} from "@wireapp/api-client/dist/commonjs/auth";

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

export type AuthActions = StartLogin
  | SuccessfulLogin
  | FailedLogin
  | StartRegisterTeam
  | SuccessfulRegisterTeam;

export interface StartLogin extends AppAction {
  readonly params: any;
  readonly type: AUTH_ACTION.LOGIN_START;
}

export interface SuccessfulLogin extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_SUCCESS;
}

export interface FailedLogin extends AppAction {
  readonly type: AUTH_ACTION.LOGIN_FAILED;
  readonly payload: any;
}

export interface StartRegisterTeam extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_TEAM_START;
  readonly params: any;
}

export interface SuccessfulRegisterTeam extends AppAction {
  readonly type: AUTH_ACTION.REGISTER_TEAM_SUCCESS;
  readonly payload: RegisterData;
}

export class AuthActionCreator {
  static startLogin = (params?: any): StartLogin => ({
    params,
    type: AUTH_ACTION.LOGIN_START,
  });

  static successfulLogin = (): SuccessfulLogin => ({
    type: AUTH_ACTION.LOGIN_SUCCESS,
  });

  static failedLogin = (error?: any): FailedLogin => ({
    payload: error,
    type: AUTH_ACTION.LOGIN_FAILED,
  });

  static startRegisterTeam = (params?: any): StartRegisterTeam => ({
    params,
    type: AUTH_ACTION.REGISTER_TEAM_START,
  });

  static successfulRegisterTeam = (authData: RegisterData): SuccessfulRegisterTeam => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_TEAM_SUCCESS,
  });

  static failedRegisterTeam = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.REGISTER_TEAM_FAILED,
  });

  static startRegisterPersonal = (params?: any) => ({
    params,
    type: AUTH_ACTION.REGISTER_PERSONAL_START,
  });

  static successfulRegisterPersonal = authData => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_PERSONAL_SUCCESS,
  });

  static failedRegisterPersonal = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.REGISTER_PERSONAL_FAILED,
  });

  static startRegisterWireless = (params?: any) => ({
    params,
    type: AUTH_ACTION.REGISTER_WIRELESS_START,
  });

  static successfulRegisterWireless = (authData: Context) => ({
    payload: authData,
    type: AUTH_ACTION.REGISTER_WIRELESS_SUCCESS,
  });

  static failedRegisterWireless = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.REGISTER_WIRELESS_FAILED,
  });

  static startRefresh = () => ({
    type: AUTH_ACTION.REFRESH_START,
  });

  static successfulRefresh = () => ({
    type: AUTH_ACTION.REFRESH_SUCCESS,
  });

  static failedRefresh = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.REFRESH_FAILED,
  });

  static startValidateLocalClient = () => ({
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_START,
  });

  static successfulValidateLocalClient = () => ({
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_SUCCESS,
  });

  static failedValidateLocalClient = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.VALIDATE_LOCAL_CLIENT_FAILED,
  });

  static startLogout = () => ({
    type: AUTH_ACTION.LOGOUT_START,
  });

  static successfulLogout = () => ({
    type: AUTH_ACTION.LOGOUT_SUCCESS,
  });

  static successfulSilentLogout = () => ({
    type: AUTH_ACTION.SILENT_LOGOUT_SUCCESS,
  });

  static failedLogout = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.LOGOUT_FAILED,
  });

  static pushAccountRegistrationData = accountData => ({
    payload: accountData,
    type: AUTH_ACTION.REGISTER_PUSH_ACCOUNT_DATA,
  });

  static startGetInvitationFromCode = () => ({
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_START,
  });

  static successfulGetInvitationFromCode = invitation => ({
    payload: invitation,
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_SUCCESS,
  });

  static failedGetInvitationFromCode = (error?: any) => ({
    payload: error,
    type: AUTH_ACTION.GET_INVITATION_FROM_CODE_FAILED,
  });
}
