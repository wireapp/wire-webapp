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

import {BackendError, BackendErrorLabel} from '@wireapp/api-client/lib/http/';
import type {AxiosError} from 'axios';

import {isAxiosError, isBackendError, isErrorWithCode, isErrorWithType} from 'Util/typePredicateUtil';
import {toError} from 'Util/toError';

describe('typePredicateUtil', () => {
  describe('isAxiosError', () => {
    it('recognizes axios error structures', () => {
      const error: AxiosError = {
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

  describe('isErrorWithCode', () => {
    it('recognizes errors with a numeric code', () => {
      const error = Object.assign(new Error('Server Error'), {code: 400});

      const actual = isErrorWithCode(error);

      expect(actual).toBeTruthy();
    });
  });

  describe('isErrorWithType', () => {
    it('recognizes errors with a string type', () => {
      const error = Object.assign(new Error('Server Error'), {type: 'CLIENT_ERROR'});

      const actual = isErrorWithType(error);

      expect(actual).toBeTruthy();
    });
  });
});
