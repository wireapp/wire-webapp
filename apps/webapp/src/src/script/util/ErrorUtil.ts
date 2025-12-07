/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http/';

import {LabeledError} from '../auth/module/action/LabeledError';

export const errorHandlerStrings = {
  [BackendErrorLabel.NO_CONVERSATION_CODE]: 'BackendError.LABEL.CONVERSATION_CODE_NOT_FOUND',
  [BackendErrorLabel.NO_CONVERSATION]: 'BackendError.LABEL.CONVERSATION_NOT_FOUND',
  [BackendErrorLabel.TOO_MANY_MEMBERS]: 'BackendError.LABEL.CONVERSATION_TOO_MANY_MEMBERS',
  [BackendErrorLabel.TOO_MANY_TEAM_MEMBERS]: 'BackendError.LABEL.TOO_MANY_MEMBERS',
  [BackendErrorLabel.ACCESS_DENIED]: 'BackendError.LABEL.ACCESS_DENIED',
  [BackendErrorLabel.BLACKLISTED_EMAIL]: 'BackendError.LABEL.BLACKLISTED_EMAIL',
  [BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION]: 'BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION',
  [BackendErrorLabel.INVALID_CODE]: 'BackendError.LABEL.INVALID_CODE',
  [BackendErrorLabel.INVALID_CREDENTIALS]: 'BackendError.LABEL.INVALID_CREDENTIALS',
  [BackendErrorLabel.INVALID_EMAIL]: 'BackendError.LABEL.INVALID_EMAIL',
  [BackendErrorLabel.KEY_EXISTS]: 'BackendError.LABEL.KEY_EXISTS',
  [SyntheticErrorLabel.ALREADY_INVITED]: 'BackendError.LABEL.ALREADY_INVITED',
  [BackendErrorLabel.MISSING_AUTH]: 'BackendError.LABEL.MISSING_AUTH',
  [BackendErrorLabel.PENDING_ACTIVATION]: 'BackendError.LABEL.PENDING_ACTIVATION',
  [BackendErrorLabel.PENDING_LOGIN]: 'BackendError.LABEL.PENDING_LOGIN',
  [BackendErrorLabel.CLIENT_ERROR]: 'BackendError.LABEL.TOO_MANY_LOGINS',
  [SyntheticErrorLabel.TOO_MANY_REQUESTS]: 'BackendError.LABEL.TOO_MANY_REQUESTS',
  [BackendErrorLabel.BAD_REQUEST]: 'BackendError.LABEL.BAD_REQUEST',
  [SyntheticErrorLabel.EMAIL_REQUIRED]: 'BackendError.LABEL.EMAIL_REQUIRED',
  [BackendErrorLabel.INVALID_OPERATION]: 'BackendError.LABEL.INVALID_OPERATION',
  [BackendErrorLabel.INVALID_PAYLOAD]: 'BackendError.LABEL.INVALID_PAYLOAD',
  [BackendErrorLabel.OPERATION_DENIED]: 'BackendError.LABEL.OPERATION_DENIED',
  [BackendErrorLabel.UNAUTHORIZED]: 'BackendError.LABEL.UNAUTHORIZED',
  [BackendErrorLabel.HANDLE_EXISTS]: 'BackendError.LABEL.HANDLE_EXISTS',
  [SyntheticErrorLabel.HANDLE_TOO_SHORT]: 'BackendError.LABEL.HANDLE_TOO_SHORT',
  [BackendErrorLabel.INVALID_HANDLE]: 'BackendError.LABEL.INVALID_HANDLE',
  [BackendErrorLabel.INVALID_INVITATION_CODE]: 'BackendError.LABEL.INVALID_INVITATION_CODE',
  [BackendErrorLabel.NO_OTHER_OWNER]: 'BackendError.LABEL.NO_OTHER_OWNER',
  [BackendErrorLabel.NO_TEAM]: 'BackendError.LABEL.NO_TEAM',
  [BackendErrorLabel.NO_TEAM_MEMBER]: 'BackendError.LABEL.NO_TEAM_MEMBER',
  [BackendErrorLabel.SUSPENDED_ACCOUNT]: 'BackendError.LABEL.SUSPENDED',
  [BackendErrorLabel.INVITE_EMAIL_EXISTS]: 'BackendError.LABEL.EMAIL_EXISTS',
  [BackendErrorLabel.SSO_FORBIDDEN]: 'BackendError.LABEL.SSO_FORBIDDEN',
  [BackendErrorLabel.INSUFFICIENT_PERMISSIONS]: 'BackendError.LABEL.SSO_INSUFFICIENT_PERMISSIONS',
  [BackendErrorLabel.SSO_INVALID_FAILURE_REDIRECT]: 'BackendError.LABEL.SSO_INVALID_FAILURE_REDIRECT',
  [BackendErrorLabel.SSO_INVALID_SUCCESS_REDIRECT]: 'BackendError.LABEL.SSO_INVALID_SUCCESS_REDIRECT',
  [BackendErrorLabel.SSO_INVALID_UPSTREAM]: 'BackendError.LABEL.SSO_INVALID_UPSTREAM',
  [BackendErrorLabel.SSO_INVALID_USERNAME]: 'BackendError.LABEL.SSO_INVALID_USERNAME',
  [BackendErrorLabel.SSO_NO_MATCHING_AUTH]: 'BackendError.LABEL.SSO_NO_MATCHING_AUTH',
  [BackendErrorLabel.NOT_FOUND]: 'BackendError.LABEL.SSO_NOT_FOUND',
  [BackendErrorLabel.SERVER_ERROR]: 'BackendError.LABEL.SSO_SERVER_ERROR',
  [BackendErrorLabel.SSO_UNSUPPORTED_SAML]: 'BackendError.LABEL.SSO_UNSUPPORTED_SAML',
  [BackendErrorLabel.CODE_AUTHENTICATION_FAILED]: 'BackendError.LABEL.CODE_AUTHENTICATION_FAILED',
  [SyntheticErrorLabel.SSO_GENERIC_ERROR]: 'BackendError.LABEL.SSO_GENERIC_ERROR',
  [LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE]: 'LabeledError.GENERAL_ERRORS.LOW_DISK_SPACE',
  [LabeledError.GENERAL_ERRORS.SYSTEM_KEYCHAIN_ACCESS]: 'LabeledError.GENERAL_ERRORS.SYSTEM_KEYCHAIN_ACCESS',
  [BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND]: 'BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND',
  [BackendErrorLabel.INVALID_CONVERSATION_PASSWORD]: 'BackendErrorLabel.INVALID_CONVERSATION_PASSWORD',
};
