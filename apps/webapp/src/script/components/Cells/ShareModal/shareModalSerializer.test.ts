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
  describe('expiration handling', () => {
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

  describe('password handling', () => {
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
});
