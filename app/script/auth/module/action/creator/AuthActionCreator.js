/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

export const REGISTER_JOIN_START = 'REGISTER_JOIN_START';
export const REGISTER_JOIN_SUCCESS = 'REGISTER_JOIN_SUCCESS';
export const REGISTER_JOIN_FAILED = 'REGISTER_JOIN_FAILED';

export const LOGOUT_START = 'LOGOUT_START';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';
export const LOGOUT_FAILED = 'LOGOUT_FAILED';
export const SILENT_LOGOUT_SUCCESS = 'LOGOUT_FAILED';

export const REFRESH_START = 'REFRESH_START';
export const REFRESH_SUCCESS = 'REFRESH_SUCCESS';
export const REFRESH_FAILED = 'REFRESH_FAILED';

export const AUTH_RESET_ERROR = 'AUTH_RESET_ERROR';

export function startLogin(params) {
  return {params, type: LOGIN_START};
}

export function successfulLogin(authData) {
  return {payload: authData, type: LOGIN_SUCCESS};
}

export function failedLogin(error) {
  return {payload: BackendError.handle(error), type: LOGIN_FAILED};
}

export function startRegisterTeam(params) {
  return {params, type: REGISTER_TEAM_START};
}

export function successfulRegisterTeam(authData) {
  return {payload: authData, type: REGISTER_TEAM_SUCCESS};
}

export function failedRegisterTeam(error) {
  return {payload: BackendError.handle(error), type: REGISTER_TEAM_FAILED};
}

export function startRegisterPersonal(params) {
  return {params, type: REGISTER_PERSONAL_START};
}

export function successfulRegisterPersonal(authData) {
  return {payload: authData, type: REGISTER_PERSONAL_SUCCESS};
}

export function failedRegisterPersonal(error) {
  return {payload: BackendError.handle(error), type: REGISTER_PERSONAL_FAILED};
}

export function startRegisterJoin(params) {
  return {params, type: REGISTER_JOIN_START};
}

export function successfulRegisterJoin(authData) {
  return {payload: authData, type: REGISTER_JOIN_SUCCESS};
}

export function failedRegisterJoin(error) {
  return {payload: BackendError.handle(error), type: REGISTER_JOIN_FAILED};
}

export function startRefresh() {
  return {type: REFRESH_START};
}

export function successfulRefresh(authData) {
  return {payload: authData, type: REFRESH_SUCCESS};
}

export function failedRefresh(error) {
  return {payload: BackendError.handle(error), type: REFRESH_FAILED};
}

export function startLogout() {
  return {type: LOGOUT_START};
}

export function successfulLogout() {
  return {type: LOGOUT_SUCCESS};
}

export function successfulSilentLogout() {
  return {type: SILENT_LOGOUT_SUCCESS};
}

export function failedLogout(error) {
  return {payload: BackendError.handle(error), type: LOGOUT_FAILED};
}

export function resetError() {
  return {type: AUTH_RESET_ERROR};
}

export function resetAccountData() {
  return {type: REGISTER_RESET_ACCOUNT_DATA};
}

export function pushAccountRegistrationData(accountData) {
  return {payload: accountData, type: REGISTER_PUSH_ACCOUNT_DATA};
}
