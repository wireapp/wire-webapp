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

import BackendError from '../BackendError';

export const LOGIN_START = 'LOGIN_START';
export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILED = 'LOGIN_FAILED';

export const REGISTER_PUSH_ACCOUNT_DATA = 'REGISTER_PUSH_ACCOUNT_DATA';
export const REGISTER_RESET_ACCOUNT_DATA = 'REGISTER_RESET_ACCOUNT_DATA';

export const REGISTER_TEAM_START = 'REGISTER_TEAM_START';
export const REGISTER_TEAM_SUCCESS = 'REGISTER_TEAM_SUCCESS';
export const REGISTER_TEAM_FAILED = 'REGISTER_TEAM_FAILED';

export const REGISTER_PERSONAL_START = 'REGISTER_PERSONAL_START';
export const REGISTER_PERSONAL_SUCCESS = 'REGISTER_PERSONAL_SUCCESS';
export const REGISTER_PERSONAL_FAILED = 'REGISTER_PERSONAL_FAILED';

export const REGISTER_WIRELESS_START = 'REGISTER_WIRELESS_START';
export const REGISTER_WIRELESS_SUCCESS = 'REGISTER_WIRELESS_SUCCESS';
export const REGISTER_WIRELESS_FAILED = 'REGISTER_WIRELESS_FAILED';

export const REGISTER_JOIN_START = 'REGISTER_JOIN_START';
export const REGISTER_JOIN_SUCCESS = 'REGISTER_JOIN_SUCCESS';
export const REGISTER_JOIN_FAILED = 'REGISTER_JOIN_FAILED';

export const LOGOUT_START = 'LOGOUT_START';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
export const LOGOUT_FAILED = 'LOGOUT_FAILED';
export const SILENT_LOGOUT_SUCCESS = 'SILENT_LOGOUT_SUCCESS';

export const REFRESH_START = 'REFRESH_START';
export const REFRESH_SUCCESS = 'REFRESH_SUCCESS';
export const REFRESH_FAILED = 'REFRESH_FAILED';

export const VALIDATE_LOCAL_CLIENT_START = 'VALIDATE_LOCAL_CLIENT_START';
export const VALIDATE_LOCAL_CLIENT_SUCCESS = 'VALIDATE_LOCAL_CLIENT_SUCCESS';
export const VALIDATE_LOCAL_CLIENT_FAILED = 'VALIDATE_LOCAL_CLIENT_FAILED';

export const GET_INVITATION_FROM_CODE_START = 'GET_INVITATION_FROM_CODE_START';
export const GET_INVITATION_FROM_CODE_SUCCESS = 'GET_INVITATION_FROM_CODE_SUCCESS';
export const GET_INVITATION_FROM_CODE_FAILED = 'GET_INVITATION_FROM_CODE_FAILED';

export const AUTH_RESET_ERROR = 'AUTH_RESET_ERROR';

export const ENTER_TEAM_CREATION_FLOW = 'ENTER_TEAM_CREATION_FLOW';
export const ENTER_PERSONAL_CREATION_FLOW = 'ENTER_PERSONAL_CREATION_FLOW';
export const ENTER_GENERIC_INVITATION_FLOW = 'ENTER_GENERIC_INVITATION_FLOW';
export const ENTER_PERSONAL_INVITATION_FLOW = 'ENTER_PERSONAL_INVITATION_FLOW';

export const startLogin = params => ({
  params,
  type: LOGIN_START,
});

export const successfulLogin = () => ({
  type: LOGIN_SUCCESS,
});

export const failedLogin = error => ({
  payload: BackendError.handle(error),
  type: LOGIN_FAILED,
});

export const startRegisterTeam = params => ({
  params,
  type: REGISTER_TEAM_START,
});

export const successfulRegisterTeam = authData => ({
  payload: authData,
  type: REGISTER_TEAM_SUCCESS,
});

export const failedRegisterTeam = error => ({
  payload: BackendError.handle(error),
  type: REGISTER_TEAM_FAILED,
});

export const startRegisterPersonal = params => ({
  params,
  type: REGISTER_PERSONAL_START,
});

export const successfulRegisterPersonal = authData => ({
  payload: authData,
  type: REGISTER_PERSONAL_SUCCESS,
});

export const failedRegisterPersonal = error => ({
  payload: BackendError.handle(error),
  type: REGISTER_PERSONAL_FAILED,
});

export const startRegisterWireless = params => ({
  params,
  type: REGISTER_WIRELESS_START,
});

export const successfulRegisterWireless = authData => ({
  payload: authData,
  type: REGISTER_WIRELESS_SUCCESS,
});

export const failedRegisterWireless = error => ({
  payload: BackendError.handle(error),
  type: REGISTER_WIRELESS_FAILED,
});

export const startRegisterJoin = params => ({
  params,
  type: REGISTER_JOIN_START,
});

export const successfulRegisterJoin = authData => ({
  payload: authData,
  type: REGISTER_JOIN_SUCCESS,
});

export const failedRegisterJoin = error => ({
  payload: BackendError.handle(error),
  type: REGISTER_JOIN_FAILED,
});

export const startRefresh = () => ({
  type: REFRESH_START,
});

export const successfulRefresh = authData => ({
  payload: authData,
  type: REFRESH_SUCCESS,
});

export const failedRefresh = error => ({
  payload: BackendError.handle(error),
  type: REFRESH_FAILED,
});

export const startValidateLocalClient = () => ({
  type: VALIDATE_LOCAL_CLIENT_START,
});

export const successfulValidateLocalClient = () => ({
  type: VALIDATE_LOCAL_CLIENT_SUCCESS,
});

export const failedValidateLocalClient = error => ({
  payload: error,
  type: VALIDATE_LOCAL_CLIENT_FAILED,
});

export const startLogout = () => ({
  type: LOGOUT_START,
});

export const successfulLogout = () => ({
  type: LOGOUT_SUCCESS,
});

export const successfulSilentLogout = () => ({
  type: SILENT_LOGOUT_SUCCESS,
});

export const failedLogout = error => ({
  payload: BackendError.handle(error),
  type: LOGOUT_FAILED,
});

export const resetError = () => ({
  type: AUTH_RESET_ERROR,
});

export const resetAccountData = () => ({
  type: REGISTER_RESET_ACCOUNT_DATA,
});

export const pushAccountRegistrationData = accountData => ({
  payload: accountData,
  type: REGISTER_PUSH_ACCOUNT_DATA,
});

export const enterTeamCreationFlow = () => ({
  type: ENTER_TEAM_CREATION_FLOW,
});

export const enterPersonalCreationFlow = () => ({
  type: ENTER_PERSONAL_CREATION_FLOW,
});

export const enterGenericInviteCreationFlow = () => ({
  type: ENTER_GENERIC_INVITATION_FLOW,
});

export const enterPersonalInvitationCreationFlow = () => ({
  type: ENTER_PERSONAL_INVITATION_FLOW,
});

export const startGetInvitationFromCode = () => ({
  type: GET_INVITATION_FROM_CODE_START,
});

export const successfulGetInvitationFromCode = invitation => ({
  payload: invitation,
  type: GET_INVITATION_FROM_CODE_SUCCESS,
});

export const failedGetInvitationFromCode = error => ({
  payload: BackendError.handle(error),
  type: GET_INVITATION_FROM_CODE_FAILED,
});
