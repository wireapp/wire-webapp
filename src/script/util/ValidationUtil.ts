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

import {ValidationError} from '../auth/module/action/ValidationError';

export class ValidationUtilError extends Error {
  constructor(message = 'Unknown ValidationUtilError') {
    super();

    this.message = message;
    this.name = this.constructor.name;

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, this.constructor);
    } else {
      this.stack = new Error(message).stack;
    }
  }
}

export const isValidUsername = (username: string) => /^@?[a-z_0-9.-]{2,256}$/.test(username);

export const isValidEmail = (email: string): boolean => {
  const regExp =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regExp.test(email);
};

// Since some special chars are allowed, remember to always
// encode Bearer tokens using encodeURIComponents afterwards!
export const isBearerToken = (token: string): boolean => /^[a-zA-Z0-9\-._~+/]+[=]{0,2}$/.test(token);

export const isUUID = (string: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(string);

export const isValidApiPath = (path: string): boolean => {
  const [urlPath] = path.split('?');
  if (!/^\/[a-zA-Z0-9\-_/,]+$/.test(urlPath)) {
    throw new ValidationUtilError(`Non-compliant path creation attempt. Details: ${path}`);
  }
  return true;
};

export const isTweetUrl = (url: string): boolean => {
  const regex =
    /^http(?:s)?:\/\/(?:(?:www|mobile|0)\.)?twitter\.com\/(?:(?:\w{1,15})\/status(?:es|\/i)?|i\/moments)\/(?:\d{2,21})(?:(?:\?|\/).*)?$/;
  return regex.test(url);
};

export const legacyAsset = (assetId: string, conversationId: string): true => {
  if (!isUUID(assetId) || !isUUID(conversationId)) {
    throw new ValidationUtilError('Invalid assetId / conversationId');
  }
  return true;
};

// https://github.com/wireapp/wire-server/blob/dc3e9a8af5250c0d045e96a31aa23c255b4e01a3/libs/cargohold-types/src/CargoHold/Types/V3.hs#L156-L177
export const assetRetentionPolicy = (policyId: number): boolean => policyId > 0 && policyId < 6;

export const assetV3 = (assetKey: string, assetToken?: string): true => {
  if (!assetKey) {
    throw new ValidationUtilError('Asset key not defined');
  }

  const SEPARATOR = '-';
  const [version, type, ...uuid] = assetKey.split(SEPARATOR);

  if (version !== '3') {
    throw new ValidationUtilError('Invalid asset key (version)');
  }
  if (!assetRetentionPolicy(parseInt(type, 10))) {
    throw new ValidationUtilError('Invalid asset key (type)');
  }
  if (!isUUID(uuid.join(SEPARATOR))) {
    throw new ValidationUtilError('Invalid asset key (UUID)');
  }
  if (assetToken && !isBearerToken(assetToken)) {
    throw new ValidationUtilError('Invalid asset token');
  }
  return true;
};

export const validationErrorStrings = {
  [ValidationError.FIELD.NAME.PATTERN_MISMATCH]: 'ValidationError.FIELD.NAME.PATTERN_MISMATCH',
  [ValidationError.FIELD.NAME.VALUE_MISSING]: 'ValidationError.FIELD.NAME.VALUE_MISSING',
  [ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH]: 'ValidationError.FIELD.PASSWORD.PATTERN_MISMATCH',
  [ValidationError.FIELD.CONFIRM_PASSWORD.PATTERN_MISMATCH]: 'ValidationError.FIELD.CONFIRM_PASSWORD.PATTERN_MISMATCH',
  [ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH]: 'ValidationError.FIELD.PASSWORD_LOGIN.PATTERN_MISMATCH',
  [ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH]: 'ValidationError.FIELD.SSO_CODE.PATTERN_MISMATCH',
  [ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH]: 'ValidationError.FIELD.SSO_EMAIL_CODE.PATTERN_MISMATCH',
  [ValidationError.FIELD.EMAIL.TYPE_MISMATCH]: 'ValidationError.FIELD.EMAIL.TYPE_MISMATCH',
};
