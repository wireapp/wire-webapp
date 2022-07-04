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

import React, {useState} from 'react';
import {t} from 'Util/LocalizerUtil';
import useDebounce from '../../../../hooks/useDebounce';
import Icon from 'Components/Icon';
import ServiceList from 'Components/ServiceList';
import {ServiceEntity} from 'src/script/integration/ServiceEntity';
import {IntegrationRepository} from 'src/script/integration/IntegrationRepository';
import {getManageServicesUrl} from '../../../../externalRoute';
import {safeWindowOpen} from 'Util/SanitizationUtil';

export const ServicesTab: React.FC<{
  canManageServices: boolean;
  integrationRepository: IntegrationRepository;
  onClickService: (service: ServiceEntity) => void;
  searchQuery: string;
}> = ({searchQuery, canManageServices, integrationRepository, onClickService}) => {
  const isInitial = false;
  const [services, setServices] = useState<ServiceEntity[]>(integrationRepository.services());
  const manageServicesUrl = getManageServicesUrl('client_landing');

  const openManageServices = () => safeWindowOpen(manageServicesUrl);

  useDebounce(
    async () => {
      const results = await integrationRepository.searchForServices(searchQuery);
      if (results) {
        setServices(results);
      }
    },
    300,
    [searchQuery],
  );

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
                    <Icon.Service />
                  </span>
                  <span className="center-column">{t('searchManageServices')}</span>
                </button>
              </li>
            </ul>
          )}
          <ServiceList arrow click={onClickService} noUnderline services={services} />
        </>
      )}
      {services.length === 0 && !isInitial && (
        <div className="search__no-services">
          <span className="search__no-services__icon">
            <Icon.Service />
          </span>
          {canManageServices && manageServicesUrl ? (
            <>
              <div className="search__no-services__info" data-uie-name="label-no-services-enabled-manager">
                {t('searchNoServicesManager')}
              </div>
              <button
                className="search__no-services__manage-button"
                type="button"
                onClick={openManageServices}
                data-uie-name="go-enable-services"
              >
                {t('searchManageServicesNoResults')}
              </button>
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
