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

export const USER_ACTIVATION_START = 'USER_ACTIVATION_START';
export const USER_ACTIVATION_SUCCESS = 'USER_ACTIVATION_SUCCESS';
export const USER_ACTIVATION_FAILED = 'USER_ACTIVATION_FAILED';

export const USER_SEND_ACTIVATION_CODE_START = 'USER_SEND_ACTIVATION_CODE_START';
export const USER_SEND_ACTIVATION_CODE_SUCCESS = 'USER_SEND_ACTIVATION_CODE_SUCCESS';
export const USER_SEND_ACTIVATION_CODE_FAILED = 'USER_SEND_ACTIVATION_CODE_FAILED';

export function startAccountActivation(params) {
  return {params, type: USER_ACTIVATION_START};
}

export function successfulAccountActivation(activationResponse) {
  return {payload: activationResponse, type: USER_ACTIVATION_SUCCESS};
}

export function failedAccountActivation(error) {
  return {payload: error, type: USER_ACTIVATION_FAILED};
}

export function startSendActivationCode(params) {
  return {params, type: USER_SEND_ACTIVATION_CODE_START};
}

export function successfulSendActivationCode(activationResponse) {
  return {payload: activationResponse, type: USER_SEND_ACTIVATION_CODE_SUCCESS};
}

export function failedSendActivationCode(error) {
  return {payload: error, type: USER_SEND_ACTIVATION_CODE_FAILED};
}
