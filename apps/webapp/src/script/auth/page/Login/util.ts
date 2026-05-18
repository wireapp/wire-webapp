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

import is from '@sindresorhus/is';
import {DomainRedirect} from '@wireapp/api-client/lib/account/domainRedirect';
import {ClientType} from '@wireapp/api-client/lib/client';
import {BackendError, BackendErrorLabel, SyntheticErrorLabel} from '@wireapp/api-client/lib/http';
import {pathWithParams} from '@wireapp/commons/lib/util/UrlUtil';
import {Dispatch, UnknownAction} from 'redux';
import {match, P} from 'ts-pattern';

import {APIClient} from 'src/script/service/apiClientSingleton';

import {actionRoot as ROOT_ACTIONS} from '../../module/action';
import {ValidationError} from '../../module/action/ValidationError';
import {ConversationState} from '../../module/reducer/conversationReducer';
import {QUERY_KEY, ROUTE} from '../../route';

export const requiresPasswordModal = (
  isOpen: boolean,
  hasPassword: boolean,
  conversationError: ConversationState['error'],
): boolean =>
  !isOpen &&
  (hasPassword ||
    (conversationError != null && conversationError.label === BackendErrorLabel.INVALID_CONVERSATION_PASSWORD));

export const buildDomainRedirectUrl = (welcomeUrl: string, existingQuery: string, clientType: ClientType): string => {
  const [path] = welcomeUrl.split('?');
  return pathWithParams(
    path,
    {[QUERY_KEY.CLIENT_TYPE]: clientType, [QUERY_KEY.SSO_AUTO_LOGIN]: true},
    undefined,
    existingQuery,
  );
};

export const handleSSOBackendError = (
  error: BackendError,
  {
    navigate,
    resetAuthError,
    setSsoError,
  }: {
    navigate: (route: string) => void;
    resetAuthError: () => void;
    setSsoError: (e: BackendError) => void;
  },
): void => {
  match(error.label)
    .with(BackendErrorLabel.TOO_MANY_CLIENTS, () => {
      resetAuthError();
      navigate(ROUTE.CLIENTS);
    })
    .with(BackendErrorLabel.CUSTOM_BACKEND_NOT_FOUND, () => setSsoError(error))
    .with(
      P.union(
        BackendErrorLabel.INVALID_CONVERSATION_PASSWORD,
        SyntheticErrorLabel.SSO_USER_CANCELLED_ERROR,
        BackendErrorLabel.NOT_FOUND,
      ),
      () => {},
    )
    .otherwise(() => {
      setSsoError(error);
      const isValidationError = Object.values(ValidationError.ERROR).some(
        errorType => is.nonEmptyString(error.label) && error.label.endsWith(errorType),
      );
      if (!isValidationError) {
        console.warn('SSO authentication error', JSON.stringify(Object.entries(error)), error);
      }
    });
};

export const handleEnterpriseLogin = async ({
  email,
  password,
  loginWithSSO,
  dispatch,
  navigate,
  apiClient,
}: {
  email: string;
  password?: string;
  loginWithSSO: (code: string, password?: string) => Promise<void>;
  dispatch: Dispatch;
  navigate: (route: string) => void;
  apiClient: APIClient;
}) => {
  const response = await apiClient.api.account.getDomainRegistration(email);

  await match(response)
    .with(
      P.union(
        {domain_redirect: DomainRedirect.NONE},
        {domain_redirect: DomainRedirect.NO_REGISTRATION},
        {domain_redirect: DomainRedirect.LOCKED},
        {domain_redirect: DomainRedirect.PRE_AUTHORIZED},
      ),
      res => {
        dispatch(
          ROOT_ACTIONS.authAction.pushAccountRegistrationData({
            accountCreationEnabled: res.domain_redirect !== DomainRedirect.NO_REGISTRATION,
            shouldDisplayWarning: res.domain_redirect === DomainRedirect.NO_REGISTRATION && res.due_to_existing_account,
          }) as unknown as UnknownAction,
        );
        navigate(ROUTE.LOGIN);
      },
    )
    .with({domain_redirect: DomainRedirect.SSO}, async res => {
      await loginWithSSO(res.sso_code, password);
    })
    .with({domain_redirect: DomainRedirect.BACKEND}, res => {
      dispatch(
        ROOT_ACTIONS.authAction.pushAccountRegistrationData({
          customBackendURL: res.backend.webapp_url,
        }) as unknown as UnknownAction,
      );
      navigate(ROUTE.CUSTOM_BACKEND);
    })
    .exhaustive();
};
