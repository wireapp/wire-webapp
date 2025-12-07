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

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ParticipantItemContent} from 'Components/ParticipantItemContent';
import {listItem, listWrapper} from 'Components/ParticipantItemContent/ParticipantItem.styles';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {TabIndex} from '@wireapp/react-ui-kit';

interface ServiceListItemProps {
  service: ServiceEntity;
  onClick: (service: ServiceEntity) => void;
}

export const ServiceListItem = ({service, onClick}: ServiceListItemProps) => {
  const {name: serviceName} = useKoSubscribableChildren(service, ['name']);
  const serviceShortDescription = service.summary;

  const onServiceClick = () => onClick(service);

  return (
    <div
      tabIndex={TabIndex.FOCUSABLE}
      role="button"
      onClick={onServiceClick}
      onKeyDown={event =>
        handleKeyDown({
          event,
          callback: onServiceClick,
          keys: [KEY.ENTER, KEY.SPACE],
        })
      }
      data-uie-name="item-service"
      data-uie-value={serviceName}
      aria-label={t('accessibility.openConversation', {name: serviceName})}
      css={listWrapper({noUnderline: true})}
    >
      <div css={listItem()}>
        <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={service} aria-hidden="true" css={{margin: '0 16px'}} />

        <ParticipantItemContent participant={service} shortDescription={serviceShortDescription} showArrow />
      </div>
    </div>
  );
};
