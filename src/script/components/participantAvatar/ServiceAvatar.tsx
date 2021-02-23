/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import ko from 'knockout';
import React, {HTMLProps} from 'react';
import {CSS_FILL_PARENT} from 'Util/CSSMixin';
import {User} from '../../entity/User';
import {AssetRepository} from '../../assets/AssetRepository';
import AvatarBackground from './AvatarBackground';
import AvatarBorder from './AvatarBorder';
import AvatarImage from './AvatarImage';
import AvatarWrapper from './AvatarWrapper';
import {AVATAR_SIZE} from '../ParticipantAvatar';
import NamedIcon from 'Components/NamedIcon';

export interface ServiceAvatarProps extends HTMLProps<HTMLDivElement> {
  assetRepository: AssetRepository;
  avatarSize: AVATAR_SIZE;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  participant: User;
}

const ServiceAvatar: React.FunctionComponent<ServiceAvatarProps> = ({
  assetRepository,
  participant,
  avatarSize,
  onClick,
}) => {
  return (
    <AvatarWrapper
      avatarSize={avatarSize}
      color="#fff"
      data-uie-name="element-avatar-service"
      data-uie-value={participant.id}
      onClick={onClick}
      title={ko.unwrap(participant.name)}
    >
      <AvatarBackground borderRadius="20%" />
      <div
        css={{
          ...CSS_FILL_PARENT,
          alignItems: 'center',
          borderRadius: '20%',
          display: 'flex',
          justifyContent: 'center',
        }}
        data-uie-name="element-avatar-service-icon"
      >
        <NamedIcon
          name="service-icon"
          viewBox="0 0 32 32"
          css={{
            '& > path': {
              fill: 'rgba(141, 152, 159, 0.24)',
            },
            width: [AVATAR_SIZE.LARGE, AVATAR_SIZE.X_LARGE].includes(avatarSize) ? '32px' : '60%',
          }}
        />
      </div>
      <AvatarImage
        assetRepository={assetRepository}
        avatarSize={avatarSize}
        borderRadius="20%"
        mediumPicture={participant.mediumPictureResource()}
        previewPicture={participant.previewPictureResource()}
      />
      <AvatarBorder borderRadius="20%" />
    </AvatarWrapper>
  );
};

export default ServiceAvatar;
