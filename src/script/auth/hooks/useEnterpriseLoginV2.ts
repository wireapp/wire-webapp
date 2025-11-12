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

import {useCallback} from 'react';

import {DomainRedirect} from '@wireapp/api-client/lib/account/DomainRedirect';
import {useDispatch} from 'react-redux';
import {useNavigate} from 'react-router';
import {UnknownAction} from 'redux';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';
import {actionRoot as ROOT_ACTIONS} from '../module/action/';
import {RegistrationDataState} from '../module/reducer/authReducer';
import {ROUTE} from '../route';

export const useEnterpriseLoginV2 = ({
  loginWithSSO,
}: {
  loginWithSSO: (code: string, password?: string) => Promise<void>;
}) => {
  const apiClient = container.resolve(APIClient);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const updateRegistrationData = useCallback(
    (data: Partial<RegistrationDataState>) => {
      dispatch(ROOT_ACTIONS.authAction.pushAccountRegistrationData(data) as unknown as UnknownAction);
    },
    [dispatch],
  );

  const loginV2 = useCallback(
    async (email: string, password?: string) => {
      const response = await apiClient.api.account.getDomainRegistration(email);

      switch (response.domain_redirect) {
        case DomainRedirect.NONE:
        case DomainRedirect.NO_REGISTRATION:
        case DomainRedirect.LOCKED:
        case DomainRedirect.PRE_AUTHORIZED: {
          updateRegistrationData({
            accountCreationEnabled: response.domain_redirect !== DomainRedirect.NO_REGISTRATION,
            shouldDisplayWarning:
              response.domain_redirect === DomainRedirect.NO_REGISTRATION && response.due_to_existing_account,
          });

          navigate(ROUTE.LOGIN);

          break;
        }

        case DomainRedirect.SSO: {
          await loginWithSSO(response.sso_code, password);
          break;
        }

        case DomainRedirect.BACKEND: {
          const url = response.backend.webapp_url;
          updateRegistrationData({
            customBackendURL: url,
          });
          navigate(ROUTE.CUSTOM_BACKEND);
          break;
        }

        default:
          break;
      }
    },
    [apiClient.api.account, loginWithSSO, navigate, updateRegistrationData],
  );

  return {
    loginV2,
  };
};
