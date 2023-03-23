/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {ServiceEntity} from '../../../../integration/ServiceEntity';

export interface ServiceListItemProps {
  service: ServiceEntity;
  onClick: (service: ServiceEntity) => void;
}

export const ServiceListItem = ({service, onClick}: ServiceListItemProps) => {
  const {name: serviceName} = useKoSubscribableChildren(service, ['name']);
  const serviceShortDescription = service.summary;

  return (
    <div
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onClick={() => onClick(service)}
      onKeyDown={event => handleKeyDown(event, () => onClick(service))}
      data-uie-name="item-service"
      data-uie-value={serviceName}
      aria-label={t('accessibility.openConversation', serviceName)}
      className="participant-item-wrapper no-underline"
    >
      <div className="participant-item">
        <div className="participant-item__image">
          <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={service} aria-hidden="true" />
        </div>

        <div className="participant-item__content">
          <div className="participant-item__content__text">
            <div className="participant-item__content__name-wrapper">
              <div className="participant-item__content__name" data-uie-name="status-name">
                {serviceName}
              </div>
            </div>

            {serviceShortDescription && (
              <div className="participant-item__content__info">
                <span
                  className="participant-item__content__username label-username-notext"
                  data-uie-name="status-username"
                >
                  {serviceShortDescription}
                </span>
              </div>
            )}
          </div>

          <Icon.ChevronRight className="chevron-right-icon participant-item__content__chevron" />
        </div>
      </div>
    </div>
  );
};
