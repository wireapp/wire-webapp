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
  /** Whether the share link already has a password set */
  hasExistingPassword?: boolean;
  /** Whether the user has clicked to edit/change the password */
  isEditingPassword?: boolean;
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
  hasExistingPassword,
  isEditingPassword,
}: ShareModalInput): ShareModalSerializedInput => {
  const trimmedPassword = passwordValue.trim();
  const hasValidExpiration = !expirationEnabled || (expirationDateTime && !expirationInvalid);

  const accessEnd = expirationEnabled
    ? expirationDateTime && !expirationInvalid
      ? Math.floor(expirationDateTime.getTime() / 1000).toString()
      : undefined
    : null;

  // Password validation and update logic
  const {isPasswordValid, updatePassword} = getPasswordValidationResult({
    passwordEnabled,
    trimmedPassword,
    hasExistingPassword,
    isEditingPassword,
  });

  return {
    accessEnd,
    isValid: Boolean(isPasswordValid && hasValidExpiration),
    passwordEnabled,
    updatePassword,
  };
};

interface PasswordValidationInput {
  passwordEnabled: boolean;
  trimmedPassword: string;
  hasExistingPassword?: boolean;
  isEditingPassword?: boolean;
}

interface PasswordValidationResult {
  isPasswordValid: boolean;
  updatePassword?: string;
}

/**
 * Determines password validity and what password value to send for update.
 *
 * Password lifecycle scenarios:
 * 1. Password disabled → valid, no update
 * 2. Existing password, not editing → valid, no update (preserve existing)
 * 3. Existing password, editing, empty input → valid, no update (preserve existing)
 * 4. Existing password, editing, with input → valid, update to new value
 * 5. No existing password, with input → valid, update to new value
 * 6. No existing password, empty input → invalid (must provide password)
 * 7. Backward compatibility (no new params) → use legacy behavior
 */
const getPasswordValidationResult = ({
  passwordEnabled,
  trimmedPassword,
  hasExistingPassword,
  isEditingPassword,
}: PasswordValidationInput): PasswordValidationResult => {
  // Scenario 1: Password is disabled
  if (!passwordEnabled) {
    return {isPasswordValid: true, updatePassword: undefined};
  }

  const hasPasswordInput = trimmedPassword.length > 0;

  // Backward compatibility: when new params are not provided, use legacy behavior
  // (This maintains behavior for existing callers)
  if (hasExistingPassword === undefined && isEditingPassword === undefined) {
    const isValid = hasPasswordInput;
    return {
      isPasswordValid: isValid,
      updatePassword: hasPasswordInput ? trimmedPassword : undefined,
    };
  }

  // Scenario 2: Existing password, user hasn't clicked "Change Password"
  if (hasExistingPassword && !isEditingPassword) {
    return {isPasswordValid: true, updatePassword: undefined};
  }

  // Scenario 3: Existing password, editing mode, but empty input → preserve existing
  if (hasExistingPassword && isEditingPassword && !hasPasswordInput) {
    return {isPasswordValid: true, updatePassword: undefined};
  }

  // Scenario 4: Existing password, editing mode, with new input → update password
  if (hasExistingPassword && isEditingPassword && hasPasswordInput) {
    return {isPasswordValid: true, updatePassword: trimmedPassword};
  }

  // Scenario 5: No existing password, with input → create new password
  if (!hasExistingPassword && hasPasswordInput) {
    return {isPasswordValid: true, updatePassword: trimmedPassword};
  }

  // Scenario 6: No existing password, empty input → invalid (must provide password)
  return {isPasswordValid: false, updatePassword: undefined};
};
