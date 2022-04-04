/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {isAxiosError, isBackendError, isQualifiedUserClientEntityMap} from 'Util/TypePredicateUtil';
import type {AxiosError} from 'axios';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/src/http/';
import {QualifiedUserClientEntityMap, UserClientEntityMap} from '../client/ClientRepository';

describe('TypePredicateUtil', () => {
  describe('isAxiosError', () => {
    it('recognizes axios error structures', () => {
      const error: AxiosError = {
        config: {},
        isAxiosError: true,
        message: 'Server Error',
        name: 'AxiosError',
        toJSON: jest.fn(),
      };

      const actual = isAxiosError(error);
      expect(actual).toBeTruthy();
    });

    it('does not fail when an error is undefined', () => {
      const actual = isAxiosError(undefined);
      expect(actual).toBeFalsy();
    });

    it('does not fail when an error is a string', () => {
      const actual = isAxiosError('Server Error');
      expect(actual).toBeFalsy();
    });
  });

  describe('isBackendError', () => {
    it('recognizes Wire backend errors', () => {
      const error = new BackendError('Server Error', BackendErrorLabel.SERVER_ERROR);
      const actual = isBackendError(error);
      expect(actual).toBeTruthy();
    });

    it('does not fail when an error is undefined', () => {
      const actual = isBackendError(undefined);
      expect(actual).toBeFalsy();
    });

    it('does not fail when an error is a string', () => {
      const actual = isBackendError('Server Error');
      expect(actual).toBeFalsy();
    });
  });

  describe('isQualifiedUserClientEntityMap', () => {
    it('recognizes a QualifiedUserClientEntityMap', () => {
      const userId = '532af01e-1e24-4366-aacf-33b67d4ee376';
      const usersMap: QualifiedUserClientEntityMap = {'example.com': {[userId]: []}};
      const actual = isQualifiedUserClientEntityMap(usersMap);

      expect(actual).toBeTruthy();
    });

    it('recognizes a UserClientEntityMap', () => {
      const userId = '532af01e-1e24-4366-aacf-33b67d4ee376';
      const usersMap: UserClientEntityMap = {[userId]: []};
      const actual = isQualifiedUserClientEntityMap(usersMap);

      expect(actual).toBeFalsy();
    });
  });
});
