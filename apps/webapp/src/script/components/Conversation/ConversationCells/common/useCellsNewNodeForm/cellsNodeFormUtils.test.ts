/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {
  getClientSideNodeNameError,
  getErrorStatus,
  isClientSideNodeNameError,
  NODE_NAME_MAX_LENGTH,
} from './cellsNodeFormUtils';

describe('cellsNodeFormUtils', () => {
  const validationCopy = {
    genericError: 'cells.newItemMenuModalForm.genericError',
    alreadyExistsError: 'cells.newItemMenuModalForm.alreadyExistsError',
    invalidCharactersError: 'cells.newItemMenuModalForm.invalidCharactersError',
    maxLengthError: 'cells.newItemMenuModalForm.maxLengthError',
    nameRequired: 'cells.newItemMenuModalForm.nameRequired',
  };

  describe('getClientSideNodeNameError', () => {
    it('returns required error for empty name', () => {
      expect(getClientSideNodeNameError('', validationCopy).unwrapOr(null)).toBe(validationCopy.nameRequired);
    });

    it('returns max length error for names longer than the maximum', () => {
      expect(getClientSideNodeNameError('a'.repeat(NODE_NAME_MAX_LENGTH + 1), validationCopy).unwrapOr(null)).toBe(
        validationCopy.maxLengthError,
      );
    });

    it('returns max length error before invalid character error', () => {
      const tooLongNameWithInvalidCharacter = `${'a'.repeat(NODE_NAME_MAX_LENGTH)}/`;
      expect(getClientSideNodeNameError(tooLongNameWithInvalidCharacter, validationCopy).unwrapOr(null)).toBe(
        validationCopy.maxLengthError,
      );
    });

    it('returns invalid character error for names starting with "."', () => {
      expect(getClientSideNodeNameError('.hidden', validationCopy).unwrapOr(null)).toBe(
        validationCopy.invalidCharactersError,
      );
      expect(getClientSideNodeNameError('.', validationCopy).unwrapOr(null)).toBe(
        validationCopy.invalidCharactersError,
      );
    });

    it('returns invalid character error for forbidden characters', () => {
      expect(getClientSideNodeNameError('report/name', validationCopy).unwrapOr(null)).toBe(
        validationCopy.invalidCharactersError,
      );
      expect(getClientSideNodeNameError('report\\name', validationCopy).unwrapOr(null)).toBe(
        validationCopy.invalidCharactersError,
      );
      expect(getClientSideNodeNameError('report"name', validationCopy).unwrapOr(null)).toBe(
        validationCopy.invalidCharactersError,
      );
    });

    it('accepts names containing dots when dot is not at the beginning', () => {
      expect(getClientSideNodeNameError('file.txt', validationCopy).isNothing).toBe(true);
      expect(getClientSideNodeNameError('my.folder', validationCopy).isNothing).toBe(true);
      expect(getClientSideNodeNameError('v1.2.report', validationCopy).isNothing).toBe(true);
    });
  });

  describe('isClientSideNodeNameError', () => {
    it('returns true for node name validation errors', () => {
      expect(isClientSideNodeNameError(validationCopy.nameRequired, validationCopy).unwrapOr(false)).toBe(true);
      expect(isClientSideNodeNameError(validationCopy.maxLengthError, validationCopy).unwrapOr(false)).toBe(true);
      expect(isClientSideNodeNameError(validationCopy.invalidCharactersError, validationCopy).unwrapOr(false)).toBe(
        true,
      );
    });

    it('returns false for non-validation errors', () => {
      expect(isClientSideNodeNameError(null, validationCopy).isNothing).toBe(true);
      expect(isClientSideNodeNameError(validationCopy.genericError, validationCopy).unwrapOr(false)).toBe(false);
    });
  });

  describe('getErrorStatus', () => {
    it('returns status for axios-like errors', () => {
      expect(getErrorStatus({response: {status: 409}}).unwrapOr(-1)).toBe(409);
      expect(getErrorStatus({isAxiosError: true, response: {status: 500}}).unwrapOr(-1)).toBe(500);
    });

    it('returns Nothing for non-axios errors or missing status', () => {
      expect(getErrorStatus(new Error('network')).isNothing).toBe(true);
      expect(getErrorStatus({response: {}}).isNothing).toBe(true);
    });
  });
});
