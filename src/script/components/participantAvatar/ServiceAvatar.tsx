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
import React from 'react';

import {CSS_FILL_PARENT} from 'Util/CSSMixin';

import {User} from '../../entity/User';
import {AssetRepository} from '../../assets/AssetRepository';

import SVGProvider from '../../auth/util/SVGProvider';

import AvatarBackground from './AvatarBackground';
import AvatarBorder from './AvatarBorder';
import AvatarImage from './AvatarImage';
import AvatarWrapper from './AvatarWrapper';
import {AVATAR_SIZE} from '../ParticipantAvatar';

export interface ServiceAvatarProps {
  assetRepository: AssetRepository;
  onClick?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  participant: User;
  size: AVATAR_SIZE;
}

const ServiceAvatar: React.FunctionComponent<ServiceAvatarProps> = ({assetRepository, participant, size, onClick}) => {
  return (
    <AvatarWrapper
      color="#fff"
      title={ko.unwrap(participant.name)}
      size={size}
      onClick={onClick}
      data-uie-name="element-avatar-service"
      data-uie-value={participant.id}
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
        <svg
          viewBox="0 0 32 32"
          css={{
            '& > path': {
              fill: 'rgba(141, 152, 159, 0.24)',
            },
            width: [AVATAR_SIZE.LARGE, AVATAR_SIZE.X_LARGE].includes(size) ? '32px' : '60%',
          }}
          dangerouslySetInnerHTML={{__html: SVGProvider['service-icon']?.documentElement?.innerHTML}}
        ></svg>
      </div>
      <AvatarImage
        assetRepository={assetRepository}
        previewPicture={participant.previewPictureResource()}
        mediumPicture={participant.mediumPictureResource()}
        borderRadius="20%"
        size={size}
      />
      <AvatarBorder borderRadius="20%" />
    </AvatarWrapper>
  );
};

export default ServiceAvatar;
