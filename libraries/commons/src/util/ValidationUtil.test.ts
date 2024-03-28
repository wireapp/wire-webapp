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

import * as ValidationUtil from './ValidationUtil';

/**
 * @testEnvironment node
 */
describe('isUUIDv4', () => {
  it('recognizes correct UUIDv4 strings', () => {
    expect(ValidationUtil.isUUIDv4('22087638-0b00-4e0d-864d-37c08041a2cf')).toBe(true);
    expect(ValidationUtil.isUUIDv4('c45bc829-f028-4550-a66b-1af2b2ac4801')).toBe(true);
    expect(ValidationUtil.isUUIDv4('D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(true);
  });

  it('recognizes incorrect UUIDv4 strings', () => {
    expect(ValidationUtil.isUUIDv4('d76259eb-25e1-46d-b170-bfcee91a2733')).toBe(false);
    expect(ValidationUtil.isUUIDv4('d76259eb')).toBe(false);
    expect(ValidationUtil.isUUIDv4('test D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(false);
    expect(ValidationUtil.isUUIDv4('0000-D45EDF1F-F1D6-4DC9-A560-84F6603A8CED')).toBe(false);
  });

  it('exports the regular expression pattern so it can be reused by external applications', () => {
    const uuid = '221b6959-6d97-483e-bb4a-e9643292a4c1';
    const url = `wire://conversation/${uuid}`;
    const actual = url.match(ValidationUtil.PATTERN.UUID_V4)?.[0];
    expect(actual).toBe(uuid);
  });
});

describe('isValidEmail', () => {
  it('recognizes valid emails', () => {
    expect(ValidationUtil.isValidEmail('test@example.com')).toBe(true);
    expect(ValidationUtil.isValidEmail('john@gmail.com')).toBe(true);
  });

  it('recognizes invalid emails', () => {
    expect(ValidationUtil.isValidEmail('a@a.a')).toBe(false);
    expect(ValidationUtil.isValidEmail('test')).toBe(false);
    expect(ValidationUtil.isValidEmail('test@')).toBe(false);
    expect(ValidationUtil.isValidEmail('test@example')).toBe(false);
    expect(ValidationUtil.isValidEmail('@example.com')).toBe(false);
  });
});

describe('isValidHandle', () => {
  it('does not accept handles starting with an @ because the backend API does not allow such values for login calls', () => {
    expect(ValidationUtil.isValidHandle('@benny')).toBe(false);
  });

  it('accepts lowercase handles', () => {
    expect(ValidationUtil.isValidHandle('benny')).toBe(true);
  });

  it('rejects handles which are not purely lowercase', () => {
    expect(ValidationUtil.isValidHandle('beNNy')).toBe(false);
  });
});

describe('getNewPasswordPattern', () => {
  it('recognizes valid passwords', () => {
    const customPasswordLength = 4;
    expect(new RegExp(ValidationUtil.getNewPasswordPattern(customPasswordLength)).test('aA1_')).toBe(true);
    expect(new RegExp(ValidationUtil.getNewPasswordPattern()).test('Passw0rd!')).toBe(true);
    expect(new RegExp(ValidationUtil.getNewPasswordPattern()).test('Pass w0rd!')).toBe(true);
    expect(new RegExp(ValidationUtil.getNewPasswordPattern()).test('Päss w0rd!')).toBe(true);
    expect(new RegExp(ValidationUtil.getNewPasswordPattern()).test('Päss\uD83D\uDC3Cw0rd!')).toBe(true);
  });

  it('recognizes invalid passwords', () => {
    const customPasswordLength = 5;
    const passwordPattern = new RegExp(ValidationUtil.getNewPasswordPattern());
    expect(new RegExp(ValidationUtil.getNewPasswordPattern(customPasswordLength)).test('aA1_')).toBe(false);
    expect(passwordPattern.test('aA1!')).toBe(false);
    expect(passwordPattern.test('A1!A1!A1!A1!')).toBe(false);
    expect(passwordPattern.test('a1!a1!a1!a1!')).toBe(false);
    expect(passwordPattern.test('aA!aA!aA!aA!')).toBe(false);
    expect(passwordPattern.test('aA1aA1aA1aA1')).toBe(false);
  });

  it('respects min and max values', () => {
    const minPasswordLength = 5;
    const maxPasswordLength = 6;
    const passwordPattern = new RegExp(ValidationUtil.getNewPasswordPattern(minPasswordLength, maxPasswordLength));
    expect(passwordPattern.test('aA1_1')).toBe(true);
    expect(passwordPattern.test('aA1_')).toBe(false);
    expect(passwordPattern.test('aA1_111')).toBe(false);
  });
});
