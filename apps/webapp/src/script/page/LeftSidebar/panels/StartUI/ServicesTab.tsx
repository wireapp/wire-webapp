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

import * as Icon from 'Components/Icon';
import {ServiceList} from 'Components/ServiceList/ServiceList';
import {IntegrationRepository} from 'Repositories/integration/IntegrationRepository';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useDebouncedCallback} from 'use-debounce';
import {t} from 'Util/LocalizerUtil';
import {safeWindowOpen} from 'Util/SanitizationUtil';

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import {getManageServicesUrl} from '../../../../externalRoute';

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
  const isInitial = false;
  const [services, setServices] = useState<ServiceEntity[]>(integrationRepository.services());
  const manageServicesUrl = getManageServicesUrl('client_landing');

  const openManageServices = () => safeWindowOpen(manageServicesUrl!);

  const debouncedSearch = useDebouncedCallback(async () => {
    const results = await integrationRepository.searchForServices(searchQuery);
    if (results) {
      setServices(results);
    }
  }, 300);

  useEffect(() => {
    debouncedSearch();
  }, [searchQuery]);

  return (
    <>
      {services.length > 0 && (
        <>
          {canManageServices && manageServicesUrl && (
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
                  <span className="column-center">{t('searchManageServices')}</span>
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

          {canManageServices && manageServicesUrl ? (
            <>
              <div className="search__no-services__info" data-uie-name="label-no-services-enabled-manager">
                {t('searchNoServicesManager')}
              </div>

              <Button
                variant={ButtonVariant.TERTIARY}
                type="button"
                onClick={openManageServices}
                data-uie-name="go-enable-services"
                style={{marginTop: '1em'}}
              >
                {t('searchManageServicesNoResults')}
              </Button>
            </>
          ) : (
            <div className="search__no-services__info" data-uie-name="label-no-services-enabled">
              {t('searchNoServicesMember')}
            </div>
          )}
        </div>
      )}
    </>
  );
};
