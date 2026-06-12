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

import {DomainRedirect} from '@wireapp/api-client/lib/account/domainRedirect';
import {ClientType} from '@wireapp/api-client/lib/client';
import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {StatusCodes} from 'http-status-codes';
import {Dispatch} from 'redux';

import {APIClient} from 'src/script/service/apiClientSingleton';
import {createDeterministicWallClock} from 'src/script/clock/deterministicWallClock';

import {actionRoot as ROOT_ACTIONS} from '../../module/action';
import {ROUTE} from '../../route';

import {buildDomainRedirectUrl, handleEnterpriseLogin, handleSSOBackendError, requiresPasswordModal} from './util';

describe('Login util', () => {
  describe('requiresPasswordModal', () => {
    it('returns true if modal is closed and conversation has password', () => {
      expect(requiresPasswordModal(false, true, null)).toBe(true);
    });

    it('returns true for invalid conversation password error when modal is closed', () => {
      const error = new BackendError(
        'Invalid conversation password',
        BackendErrorLabel.INVALID_CONVERSATION_PASSWORD,
        StatusCodes.FORBIDDEN,
      );

      expect(requiresPasswordModal(false, false, error)).toBe(true);
    });

    it('returns false when modal is already open', () => {
      const error = new BackendError(
        'Invalid conversation password',
        BackendErrorLabel.INVALID_CONVERSATION_PASSWORD,
        StatusCodes.FORBIDDEN,
      );

      expect(requiresPasswordModal(true, true, error)).toBe(false);
    });
  });

  describe('buildDomainRedirectUrl', () => {
    it('adds client type and sso auto login params while preserving existing query', () => {
      const redirectUrl = buildDomainRedirectUrl(
        'https://example.wire.link/welcome?unused=value',
        'team=42',
        ClientType.PERMANENT,
      );

      expect(redirectUrl).toContain('https://example.wire.link/welcome?');
      expect(redirectUrl).toContain('team=42');
      expect(redirectUrl).toContain('clienttype=permanent');
      expect(redirectUrl).toContain('sso_auto_login=true');
    });
  });

  describe('handleSSOBackendError', () => {
    it('resets auth error and navigates to clients route for too many clients', () => {
      const navigate = jest.fn();
      const resetAuthError = jest.fn();
      const setSsoError = jest.fn();

      const error = new BackendError('Too many clients', BackendErrorLabel.TOO_MANY_CLIENTS, StatusCodes.NOT_FOUND);

      handleSSOBackendError(error, {navigate, resetAuthError, setSsoError});

      expect(resetAuthError).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(ROUTE.CLIENTS);
      expect(setSsoError).not.toHaveBeenCalled();
    });

    it('sets SSO error for custom backend not found', () => {
      const navigate = jest.fn();
      const resetAuthError = jest.fn();
      const setSsoError = jest.fn();

      const error = new BackendError(
        'Custom backend not found',
        BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND,
        StatusCodes.NOT_FOUND,
      );

      handleSSOBackendError(error, {navigate, resetAuthError, setSsoError});

      expect(setSsoError).toHaveBeenCalledWith(error);
      expect(resetAuthError).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('does not set error or navigate for ignored errors', () => {
      const navigate = jest.fn();
      const resetAuthError = jest.fn();
      const setSsoError = jest.fn();

      const error = new BackendError('User cancelled', SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR, StatusCodes.OK);

      handleSSOBackendError(error, {navigate, resetAuthError, setSsoError});

      expect(setSsoError).not.toHaveBeenCalled();
      expect(resetAuthError).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('sets SSO error and logs unknown errors', () => {
      const navigate = jest.fn();
      const resetAuthError = jest.fn();
      const setSsoError = jest.fn();
      jest.spyOn(console, 'warn').mockImplementation(() => {});

      const error = new BackendError('Unknown backend issue', BackendErrorLabel.SSO_FORBIDDEN, StatusCodes.FORBIDDEN);

      handleSSOBackendError(error, {navigate, resetAuthError, setSsoError});

      expect(setSsoError).toHaveBeenCalledWith(error);
      expect(console.warn).toHaveBeenCalledTimes(1);
      expect(resetAuthError).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('handleEnterpriseLogin', () => {
    const email = 'someone@example.com';
    const password = 'secret-password';

    let dispatch: Dispatch;
    let dispatchSpy: jest.Mock;
    let navigate: jest.MockedFunction<(route: string) => void>;
    let loginWithSSO: jest.MockedFunction<(code: string, password?: string) => Promise<void>>;
    let apiClient: APIClient;

    beforeEach(() => {
      dispatchSpy = jest.fn();
      dispatch = dispatchSpy;
      navigate = jest.fn();
      loginWithSSO = jest.fn().mockResolvedValue(undefined);
      apiClient = new APIClient({
        wallClock: createDeterministicWallClock(),
      });
      jest.spyOn(ROOT_ACTIONS.authAction, 'pushAccountRegistrationData').mockImplementation(() => {
        return () => Promise.resolve();
      });
    });

    it('dispatches registration data and navigates to login for no registration redirects', async () => {
      jest
        .spyOn(apiClient.api.account, 'getDomainRegistration')
        .mockResolvedValue({domain_redirect: DomainRedirect.NO_REGISTRATION, due_to_existing_account: true});

      await handleEnterpriseLogin({email, password, loginWithSSO, dispatch, navigate, apiClient});

      expect(ROOT_ACTIONS.authAction.pushAccountRegistrationData).toHaveBeenCalledWith({
        accountCreationEnabled: false,
        shouldDisplayWarning: true,
      });
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(ROUTE.LOGIN);
      expect(loginWithSSO).not.toHaveBeenCalled();
    });

    it('calls SSO login for SSO redirects', async () => {
      jest
        .spyOn(apiClient.api.account, 'getDomainRegistration')
        .mockResolvedValue({domain_redirect: DomainRedirect.SSO, sso_code: 'wire-sso-code'});

      await handleEnterpriseLogin({email, password, loginWithSSO, dispatch, navigate, apiClient});

      expect(loginWithSSO).toHaveBeenCalledWith('wire-sso-code', password);
      expect(dispatchSpy).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('dispatches backend URL and navigates to custom backend route for backend redirects', async () => {
      jest.spyOn(apiClient.api.account, 'getDomainRegistration').mockResolvedValue({
        domain_redirect: DomainRedirect.BACKEND,
        backend: {
          config_url: 'https://backend.example/config.json',
          webapp_url: 'https://backend.example/auth',
        },
      });

      await handleEnterpriseLogin({email, password, loginWithSSO, dispatch, navigate, apiClient});

      expect(ROOT_ACTIONS.authAction.pushAccountRegistrationData).toHaveBeenCalledWith({
        customBackendURL: 'https://backend.example/auth',
      });
      expect(dispatchSpy).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledWith(ROUTE.CUSTOM_BACKEND);
      expect(loginWithSSO).not.toHaveBeenCalled();
    });
  });
});
