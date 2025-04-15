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

import {DomainRedirect} from '@wireapp/api-client/lib/account/DomainRedirect';
import {useNavigate} from 'react-router';
import {container} from 'tsyringe';

import {APIClient} from '../../service/APIClientSingleton';
import {ROUTE} from '../route';
import {getValidatedBackendConfig} from '../util/configUtil';

export const useEnterpriseLoginV2 = ({
  loginWithSSO,
}: {
  loginWithSSO: (code: string, password?: string) => Promise<void>;
}) => {
  const apiClient = container.resolve(APIClient);
  const navigate = useNavigate();

  const loginV2 = async (email: string, password?: string) => {
    const response = await apiClient.api.account.getDomainRegistration(email);

    switch (response.domain_redirect) {
      case DomainRedirect.NONE:
      case DomainRedirect.NO_REGISTRATION:
      case DomainRedirect.LOCKED:
      case DomainRedirect.PRE_AUTHORIZED: {
        navigate(ROUTE.LOGIN, {
          state: {
            email,
            accountCreationEnabled: response.domain_redirect !== DomainRedirect.NO_REGISTRATION,
            shouldDisplayWarning: response.domain_redirect === DomainRedirect.NONE,
          },
        });

        break;
      }

      case DomainRedirect.SSO: {
        await loginWithSSO(response.sso_code, password);
        break;
      }

      case DomainRedirect.BACKEND: {
        const config = await getValidatedBackendConfig(response.backend_url);

        navigate(ROUTE.CUSTOM_BACKEND, {
          state: {
            email,
            config,
          },
        });
        break;
      }

      default:
        break;
    }
  };

  return {
    loginV2,
  };
};
