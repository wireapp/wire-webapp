/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import cx from 'classnames';
import {ServiceListItem} from 'Components/ServiceList/components/ServiceListItem';
import type {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {t} from 'Util/LocalizerUtil';

enum MODE {
  COMPACT = 'ServiceList.MODE.COMPACT',
  DEFAULT = 'ServiceList.MODE.DEFAULT',
}

interface ServiceListProps {
  services: ServiceEntity[];
  onServiceClick: (serviceEntity: ServiceEntity) => void;
  isSearching?: boolean;
  mode?: MODE;
  dataUieName?: string;
}

export const ServiceList = ({
  onServiceClick,
  isSearching = false,
  mode = MODE.DEFAULT,
  services,
  dataUieName = '',
}: ServiceListProps) => (
  <>
    <ul
      className={cx('search-list', mode === MODE.COMPACT ? 'search-list-sm' : 'search-list-lg')}
      data-uie-name={dataUieName}
    >
      {services.map(service => (
        <li key={service.id}>
          <div className="search-list-button" data-uie-name={`service-list-service-${service.id}`}>
            <ServiceListItem service={service} onClick={onServiceClick} />
          </div>
        </li>
      ))}
    </ul>

    {isSearching && !services.length && (
      <div className="no-results" data-uie-name="service-list-no-results">
        {t('searchListNoMatches')}
      </div>
    )}
  </>
);
