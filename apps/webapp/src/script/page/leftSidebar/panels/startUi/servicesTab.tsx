/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {useState, useEffect} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {ServiceList} from 'Components/ServiceList/ServiceList';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {safeWindowOpen} from 'Util/sanitizationUtil';

import {getManageServicesUrl} from '../../../../externalRoute';

const SEARCH_DEBOUNCE_MILLISECONDS = 300;

export const ServicesTab = ({
  searchQuery,
  canManageServices,
  integrationRepository,
  onClickService,
}: {
  canManageServices: boolean;
  integrationRepository: IntegrationRepository;
  onClickService: (service: ServiceEntity) => void;
  searchQuery: string;
}) => {
  const {translate} = useApplicationContext();
  const isInitial = false;
  const [services, setServices] = useState<ServiceEntity[]>(integrationRepository.services());
  const manageServicesUrl = getManageServicesUrl('client_landing');

  const openManageServices = () => safeWindowOpen(manageServicesUrl!);

  const debouncedSearch = useDebouncedCallback(async () => {
    const results = await integrationRepository.searchForServices(searchQuery);
    if (results !== null && results !== undefined) {
      setServices(results);
    }
  }, SEARCH_DEBOUNCE_MILLISECONDS);

  useEffect(() => {
    void debouncedSearch();
  }, [debouncedSearch]);

  return (
    <>
      {services.length > 0 && (
        <>
          {canManageServices &&
            manageServicesUrl !== null &&
            manageServicesUrl !== undefined &&
            manageServicesUrl.length > 0 && (
              <ul className="start-ui-manage-services left-list-items">
                <li className="left-list-item">
                  <button
                    className="left-list-item-button"
                    type="button"
                    onClick={openManageServices}
                    data-uie-name="go-manage-services"
                  >
                    <span className="left-column-icon">
                      <Icon.ServiceIcon />
                    </span>
                    <span className="column-center">{translate('searchManageServices')}</span>
                  </button>
                </li>
              </ul>
            )}

          <ServiceList onServiceClick={onClickService} services={services} />
        </>
      )}
      {services.length === 0 && !isInitial && (
        <div className="search__no-services">
          <span className="search__no-services__icon">
            <Icon.ServiceIcon />
          </span>

          {canManageServices &&
          manageServicesUrl !== null &&
          manageServicesUrl !== undefined &&
          manageServicesUrl.length > 0 ? (
            <>
              <div className="search__no-services__info" data-uie-name="label-no-services-enabled-manager">
                {translate('searchNoServicesManager')}
              </div>

              <Button
                variant={ButtonVariant.TERTIARY}
                type="button"
                onClick={openManageServices}
                data-uie-name="go-enable-services"
                style={{marginTop: '1em'}}
              >
                {translate('searchManageServicesNoResults')}
              </Button>
            </>
          ) : (
            <div className="search__no-services__info" data-uie-name="label-no-services-enabled">
              {translate('searchNoServicesMember')}
            </div>
          )}
        </div>
      )}
    </>
  );
};
