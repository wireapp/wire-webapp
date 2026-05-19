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

import {useId} from 'react';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {authorLabel, description, header, panel} from 'Components/panel/ServiceDetails.styles';
import type {ServiceEntity} from 'Repositories/integration/serviceEntity';
import {useKoSubscribableChildren} from 'Util/componentUtil';
import {t} from 'Util/localizerUtil';

interface ServiceDetailsProps {
  service: ServiceEntity;
}

const ServiceDetails = ({service}: ServiceDetailsProps) => {
  const {providerName, name, author} = useKoSubscribableChildren(service, ['providerName', 'name', 'author']);

  const descriptionId = useId();

  return (
    <div css={panel}>
      <div css={header}>
        <Avatar
          css={header.avatar}
          participant={service}
          avatarSize={AVATAR_SIZE.X_LARGE}
          data-uie-name="status-profile-picture"
        />

        <div css={header.info}>
          <div css={header.info.name} data-uie-name="status-service-name">
            {name}
          </div>
          <div css={header.info.subHeader} data-uie-name="status-service-provider">
            {providerName}
          </div>
        </div>
      </div>

      <p css={authorLabel}>{t('serviceDetailsAuthor', {author: author ?? ''})}</p>

      <div css={description}>
        <div id={descriptionId} css={description.headline}>
          {t('serviceDetailsDescription')}
        </div>
        <p aria-labelledby={descriptionId} data-uie-name="status-service-description">
          {service.description}
        </p>
      </div>
    </div>
  );
};

export {ServiceDetails};
