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

import React, {useEffect, useState} from 'react';
import {Transition} from 'react-transition-group';
import {CSSObject} from '@emotion/serialize';

import {CSS_FILL_PARENT} from 'Util/CSSMixin';

import {User} from '../../entity/User';
import {AssetRemoteData} from '../../assets/AssetRemoteData';
import {AssetRepository} from '../../assets/AssetRepository';

import {AVATAR_SIZE} from '../ParticipantAvatarComponent';

export interface AvatarImageProps {
  assetRepository: AssetRepository;
  borderRadius?: string;
  isGrey?: boolean;
  participant: User;
  size: AVATAR_SIZE;
}

const AvatarImage: React.FunctionComponent<AvatarImageProps> = ({
  assetRepository,
  participant,
  borderRadius = '50%',
  size,
  isGrey = false,
}) => {
  const [avatarImage, setAvatarImage] = useState('');
  let avatarLoadingBlocked = false;
  let showTransition = false;

  useEffect(() => {
    loadAvatarPicture();
  }, [participant]);

  const loadAvatarPicture = async () => {
    if (!avatarLoadingBlocked) {
      avatarLoadingBlocked = true;

      const isSmall = size !== AVATAR_SIZE.LARGE && size !== AVATAR_SIZE.X_LARGE;
      const loadHiRes = !isSmall && window.devicePixelRatio > 1;
      const pictureResource: AssetRemoteData = loadHiRes
        ? participant.mediumPictureResource()
        : participant.previewPictureResource();

      if (pictureResource) {
        const isCached = pictureResource.downloadProgress() === 100;
        showTransition = !isCached && !isSmall;
        try {
          const url = await assetRepository.getObjectUrl(pictureResource);
          if (url) {
            setAvatarImage(url);
          }
          avatarLoadingBlocked = false;
        } catch (error) {
          console.warn('Failed to load avatar picture.', error);
        }
      } else {
        avatarLoadingBlocked = false;
      }
    }
  };

  const transitionImageStyles: Record<string, CSSObject> = {
    entered: {opacity: 1, transform: 'scale(1)'},
    entering: {opacity: 0, transform: 'scale(0.88)'},
  };

  return (
    <Transition in={!!avatarImage} timeout={showTransition ? 700 : 0}>
      {(state: string) => (
        <img
          css={{
            ...CSS_FILL_PARENT,
            borderRadius,
            filter: isGrey ? 'grayscale(100%)' : 'none',
            height: '100%',
            objectFit: 'cover',
            opacity: 0,
            overflow: 'hidden',
            transform: 'scale(0.88)',
            transition: showTransition ? 'all 0.55s cubic-bezier(0.165, 0.84, 0.44, 1) 0.15s' : 'none',
            width: '100%',
            ...transitionImageStyles[state],
          }}
          src={avatarImage}
        />
      )}
    </Transition>
  );
};

export default AvatarImage;
