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

import {generateRandomPassword, isValidPassword} from './StringUtil';

describe('generateRandomPassword', () => {
  it('generates a password of default length (8)', () => {
    const password = generateRandomPassword();
    expect(password).toHaveLength(8);
  });

  it('generates a password of specified length', () => {
    const password = generateRandomPassword(16);
    expect(password).toHaveLength(16);
  });

  it('contains at least one lowercase letter, one uppercase letter, one number, and one special character', () => {
    const password = generateRandomPassword(12);

    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-={}[\];',.?/~`|:"<>]/.test(password);

    expect(hasLowercase).toBe(true);
    expect(hasUppercase).toBe(true);
    expect(hasNumber).toBe(true);
    expect(hasSpecialChar).toBe(true);
  });

  it('generates different passwords each time', () => {
    const password1 = generateRandomPassword(12);
    const password2 = generateRandomPassword(12);
    expect(password1).not.toEqual(password2);
  });

  it('does not truncate when given length is less than 4', () => {
    const password = generateRandomPassword(3);
    expect(password).toHaveLength(3);
  });

  it('shuffles characters sufficiently', () => {
    const password = generateRandomPassword(12);
    const sortedPassword = password.split('').sort().join('');
    expect(password).not.toEqual(sortedPassword); // Rare chance of equality, indicates weak shuffling
  });
});

describe('isValidPassword', () => {
  it('returns true for a valid password with all required character types', () => {
    const password = 'Abc123$%';
    expect(isValidPassword(password)).toBe(true);
  });

  it('returns false for a password without a lowercase letter', () => {
    const password = 'ABC123$%';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns false for a password without an uppercase letter', () => {
    const password = 'abc123$%';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns false for a password without a number', () => {
    const password = 'Abcdef$%';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns false for a password without a special character', () => {
    const password = 'Abc12345';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns false for a password shorter than 8 characters', () => {
    const password = 'Abc1$';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns true for a longer password with all requirements met', () => {
    const password = 'A1b@C3dEf$g!';
    expect(isValidPassword(password)).toBe(true);
  });

  it('returns false for an empty string', () => {
    const password = '';
    expect(isValidPassword(password)).toBe(false);
  });

  it('returns false for a password with only spaces', () => {
    const password = '        ';
    expect(isValidPassword(password)).toBe(false);
  });

  it('handles edge cases with non-alphanumeric special characters correctly', () => {
    const password = 'A1b@c$d^';
    expect(isValidPassword(password)).toBe(true);
  });
});
