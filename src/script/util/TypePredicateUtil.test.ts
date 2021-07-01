import {isAxiosError, isBackendError} from 'Util/TypePredicateUtil';
import type {AxiosError} from 'axios';
import {BackendError, BackendErrorLabel} from '@wireapp/api-client/src/http/';

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
});
