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
  searchQuery: string;
}> = ({searchQuery, canManageServices, integrationRepository}) => {
  const isInitial = false;
  const [services, setServices] = useState<ServiceEntity[]>(integrationRepository.services());
  const manageServicesUrl = getManageServicesUrl('client_landing');

  const openManageServices = () => safeWindowOpen(manageServicesUrl);

  useDebounce(
    async () => {
      const results = await integrationRepository.searchForServices(searchQuery);
      setServices(results);
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
                  data-bind="click: clickOpenManageServices"
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
          <ServiceList
            arrow={true}
            click={function (serviceEntity: ServiceEntity): void {
              throw new Error('Function not implemented.');
            }}
            noUnderline={true}
            services={services}
          />
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
