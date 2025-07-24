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

import React from 'react';

import ko from 'knockout';

import * as Icon from 'Components/Icon';
import {ServiceEntity} from 'Repositories/integration/ServiceEntity';
import {CSS_FILL_PARENT} from 'Util/CSSMixin';

import {AvatarBackground} from './AvatarBackground';
import {AvatarBorder} from './AvatarBorder';
import {AvatarImage} from './AvatarImage';
import {AvatarWrapper} from './AvatarWrapper';

import {AVATAR_SIZE} from '.';

interface ServiceAvatarProps extends React.HTMLProps<HTMLDivElement> {
  avatarSize: AVATAR_SIZE;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  participant: ServiceEntity;
}

const ServiceAvatar: React.FunctionComponent<ServiceAvatarProps> = ({participant, avatarSize, onClick, ...props}) => {
  return (
    <AvatarWrapper
      color="#fff"
      title={ko.unwrap(participant.name)}
      avatarSize={avatarSize}
      onClick={onClick}
      data-uie-name="element-avatar-service"
      data-uie-value={participant.id}
      {...props}
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
        <Icon.ServiceIcon
          css={{
            '& > path': {
              fill: 'rgba(141, 152, 159, 0.24)',
            },
            width: [AVATAR_SIZE.LARGE, AVATAR_SIZE.X_LARGE].includes(avatarSize) ? '32px' : '60%',
          }}
        />
      </div>
      <AvatarImage
        avatarSize={avatarSize}
        avatarAlt={ko.unwrap(participant.name)}
        borderRadius="20%"
        mediumPicture={participant.mediumPictureResource()}
        previewPicture={participant.previewPictureResource()}
      />
      <AvatarBorder borderRadius="20%" />
    </AvatarWrapper>
  );
};

export {ServiceAvatar};
