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

import React, {Fragment} from 'react';
import cx from 'classnames';

import ParticipantItem from 'Components/list/ParticipantItem';

import type {ServiceEntity} from '../integration/ServiceEntity';
import {t} from '../util/LocalizerUtil';
import {KEY} from 'Util/KeyboardUtil';

export interface ServiceListProps {
  services: ServiceEntity[];
  click: (serviceEntity: ServiceEntity) => void;
  arrow: boolean;
  noUnderline: boolean;
  isSearching?: boolean;
  mode?: MODE;
  dataUieName?: string;
}

export enum MODE {
  COMPACT = 'ServiceList.MODE.COMPACT',
  DEFAULT = 'ServiceList.MODE.DEFAULT',
}

const ServiceList: React.FC<ServiceListProps> = ({
  arrow,
  click,
  isSearching = false,
  mode = MODE.DEFAULT,
  noUnderline,
  services,
  dataUieName = '',
}) => {
  const handleKeyDown = (event: KeyboardEvent, service: ServiceEntity) => {
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      click(service);
    }
  };

  return (
    <Fragment>
      <ul
        className={cx('search-list', mode === MODE.COMPACT ? 'search-list-sm' : 'search-list-lg')}
        data-uie-name={dataUieName}
      >
        {services.map(service => (
          <li key={service.id}>
            <div className="search-list-button" data-uie-name={`service-list-service-${service.id}`}>
              <ParticipantItem
                participant={service}
                noUnderline={noUnderline}
                showArrow={arrow}
                onClick={() => click(service)}
                onKeyDown={(service, event) => handleKeyDown(event, service)}
              />
            </div>
          </li>
        ))}
      </ul>

      {isSearching && !services.length && (
        <div className="no-results" data-uie-name="service-list-no-results">
          {t('searchListNoMatches')}
        </div>
      )}
    </Fragment>
  );
};

export default ServiceList;
