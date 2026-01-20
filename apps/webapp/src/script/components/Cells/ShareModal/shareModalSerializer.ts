/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

interface ShareModalInput {
  passwordEnabled: boolean;
  passwordValue: string;
  expirationEnabled: boolean;
  expirationDateTime: Date | null;
  expirationInvalid: boolean;
}

export interface ShareModalSerializedInput {
  accessEnd?: string | null;
  isValid: boolean;
  passwordEnabled: boolean;
  updatePassword?: string;
}

export const serializeShareModalInput = ({
  passwordEnabled,
  passwordValue,
  expirationEnabled,
  expirationDateTime,
  expirationInvalid,
}: ShareModalInput): ShareModalSerializedInput => {
  const trimmedPassword = passwordValue.trim();
  const hasPassword = passwordEnabled && trimmedPassword.length > 0;
  const isPasswordValid = !passwordEnabled || hasPassword;
  const hasValidExpiration = !expirationEnabled || (expirationDateTime && !expirationInvalid);

  const accessEnd = expirationEnabled
    ? expirationDateTime && !expirationInvalid
      ? Math.floor(expirationDateTime.getTime() / 1000).toString()
      : undefined
    : null;

  return {
    accessEnd,
    isValid: Boolean(isPasswordValid && hasValidExpiration),
    passwordEnabled,
    updatePassword: hasPassword ? trimmedPassword : undefined,
  };
};
