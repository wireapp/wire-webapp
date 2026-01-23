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

import {serializeShareModalInput} from './shareModalSerializer';

describe('serializeShareModalInput', () => {
  const baseInput = {
    passwordEnabled: true,
    passwordValue: '',
    expirationEnabled: false,
    expirationDateTime: null,
    expirationInvalid: false,
  };

  describe('password handling', () => {
    it('should be valid and not update password when existing password and not editing', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '',
        hasExistingPassword: true,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBeUndefined();
      expect(result.passwordEnabled).toBe(true);
    });

    it('should be valid and preserve existing password when editing but password empty', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '',
        hasExistingPassword: true,
        isEditingPassword: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBeUndefined();
      expect(result.passwordEnabled).toBe(true);
    });

    it('should be valid and update password when editing with new value', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: 'newSecurePassword123',
        hasExistingPassword: true,
        isEditingPassword: true,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBe('newSecurePassword123');
      expect(result.passwordEnabled).toBe(true);
    });

    it('should be valid and set password for new password with value', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: 'brandNewPassword456',
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBe('brandNewPassword456');
      expect(result.passwordEnabled).toBe(true);
    });

    it('should be invalid when new password required but empty', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '',
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.updatePassword).toBeUndefined();
      expect(result.passwordEnabled).toBe(true);
    });

    it('should maintain backward compatibility when new params not provided', () => {
      // When hasExistingPassword and isEditingPassword are not provided,
      // it should use legacy behavior: require password input
      const resultWithPassword = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: 'legacyPassword',
      });

      expect(resultWithPassword.isValid).toBe(true);
      expect(resultWithPassword.updatePassword).toBe('legacyPassword');
      expect(resultWithPassword.passwordEnabled).toBe(true);

      const resultWithoutPassword = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '',
      });

      expect(resultWithoutPassword.isValid).toBe(false);
      expect(resultWithoutPassword.updatePassword).toBeUndefined();
    });

    it('should be valid when password is disabled regardless of other params', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: false,
        passwordValue: '',
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBeUndefined();
      expect(result.passwordEnabled).toBe(false);
    });

    it('should trim whitespace from password value', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '  passwordWithSpaces  ',
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBe('passwordWithSpaces');
    });

    it('should treat whitespace-only password as empty', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: true,
        passwordValue: '   ',
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(false);
      expect(result.updatePassword).toBeUndefined();
    });

    it('returns updatePassword when password is enabled with non-empty value', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: 'secret123',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.updatePassword).toBe('secret123');
      expect(result.passwordEnabled).toBe(true);
      expect(result.isValid).toBe(true);
    });

    it('trims password value and returns trimmed password', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: '  secret123  ',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.updatePassword).toBe('secret123');
    });

    it('returns isValid as false when password is enabled but value is empty', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: '',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.updatePassword).toBeUndefined();
      expect(result.isValid).toBe(false);
    });

    it('returns isValid as false when password is enabled but value is only whitespace', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: '   ',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.updatePassword).toBeUndefined();
      expect(result.isValid).toBe(false);
    });

    it('returns updatePassword as undefined when password is disabled', () => {
      const result = serializeShareModalInput({
        passwordEnabled: false,
        passwordValue: 'ignored-password',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.updatePassword).toBeUndefined();
      expect(result.passwordEnabled).toBe(false);
    });
  });

  describe('expiration handling', () => {
    it('should return null accessEnd when expiration is disabled', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        expirationEnabled: false,
        expirationDateTime: null,
      });

      expect(result.accessEnd).toBeNull();
    });

    it('should return timestamp string when expiration is enabled with valid date', () => {
      const expirationDate = new Date('2025-06-15T12:00:00Z');
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: false,
        expirationEnabled: true,
        expirationDateTime: expirationDate,
        expirationInvalid: false,
      });

      const expectedTimestamp = Math.floor(expirationDate.getTime() / 1000).toString();
      expect(result.accessEnd).toBe(expectedTimestamp);
      expect(result.isValid).toBe(true);
    });

    it('should be invalid when expiration is enabled but date is invalid', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: false,
        expirationEnabled: true,
        expirationDateTime: new Date(),
        expirationInvalid: true,
      });

      expect(result.accessEnd).toBeUndefined();
      expect(result.isValid).toBe(false);
    });

    it('should be invalid when expiration is enabled but no date provided', () => {
      const result = serializeShareModalInput({
        ...baseInput,
        passwordEnabled: false,
        expirationEnabled: true,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.isValid).toBe(false);
    });

    it('returns accessEnd as null when expiration is disabled', () => {
      const result = serializeShareModalInput({
        passwordEnabled: false,
        passwordValue: '',
        expirationEnabled: false,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.accessEnd).toBeNull();
      expect(result.isValid).toBe(true);
    });

    it('returns accessEnd as timestamp string when expiration is enabled with valid date', () => {
      const expirationDate = new Date('2025-12-31T23:59:59.000Z');
      const expectedTimestamp = Math.floor(expirationDate.getTime() / 1000).toString();

      const result = serializeShareModalInput({
        passwordEnabled: false,
        passwordValue: '',
        expirationEnabled: true,
        expirationDateTime: expirationDate,
        expirationInvalid: false,
      });

      expect(result.accessEnd).toBe(expectedTimestamp);
      expect(result.isValid).toBe(true);
    });

    it('returns accessEnd as undefined and isValid as false when expiration is enabled but date is null', () => {
      const result = serializeShareModalInput({
        passwordEnabled: false,
        passwordValue: '',
        expirationEnabled: true,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.accessEnd).toBeUndefined();
      expect(result.isValid).toBe(false);
    });

    it('returns accessEnd as undefined and isValid as false when expiration is enabled but date is invalid', () => {
      const result = serializeShareModalInput({
        passwordEnabled: false,
        passwordValue: '',
        expirationEnabled: true,
        expirationDateTime: new Date('2025-12-31T23:59:59.000Z'),
        expirationInvalid: true,
      });

      expect(result.accessEnd).toBeUndefined();
      expect(result.isValid).toBe(false);
    });
  });

  describe('combined validation', () => {
    it('returns isValid as true when both password and expiration are valid', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: 'secret123',
        expirationEnabled: true,
        expirationDateTime: new Date('2025-12-31T23:59:59.000Z'),
        expirationInvalid: false,
      });

      expect(result.isValid).toBe(true);
    });

    it('returns isValid as false when password is invalid even if expiration is valid', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: '',
        expirationEnabled: true,
        expirationDateTime: new Date('2025-12-31T23:59:59.000Z'),
        expirationInvalid: false,
      });

      expect(result.isValid).toBe(false);
    });

    it('returns isValid as false when expiration is invalid even if password is valid', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: 'secret123',
        expirationEnabled: true,
        expirationDateTime: null,
        expirationInvalid: false,
      });

      expect(result.isValid).toBe(false);
    });
  });

  describe('combined password and expiration scenarios', () => {
    it('should be valid only when both password and expiration are valid', () => {
      const expirationDate = new Date('2025-06-15T12:00:00Z');
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: 'securePassword',
        expirationEnabled: true,
        expirationDateTime: expirationDate,
        expirationInvalid: false,
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.updatePassword).toBe('securePassword');
      expect(result.accessEnd).toBe(Math.floor(expirationDate.getTime() / 1000).toString());
    });

    it('should be invalid when password is valid but expiration is invalid', () => {
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: 'securePassword',
        expirationEnabled: true,
        expirationDateTime: new Date(),
        expirationInvalid: true,
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(false);
    });

    it('should be invalid when expiration is valid but password is invalid', () => {
      const expirationDate = new Date('2025-06-15T12:00:00Z');
      const result = serializeShareModalInput({
        passwordEnabled: true,
        passwordValue: '',
        expirationEnabled: true,
        expirationDateTime: expirationDate,
        expirationInvalid: false,
        hasExistingPassword: false,
        isEditingPassword: false,
      });

      expect(result.isValid).toBe(false);
    });
  });
});
