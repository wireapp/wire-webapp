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

import {CSSObject} from '@emotion/serialize';
import {Transition} from 'react-transition-group';
import {container} from 'tsyringe';

import {InViewport} from 'Components/InViewport';
import {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {CSS_FILL_PARENT} from 'Util/CSSMixin';
import {getLogger} from 'Util/Logger';

const logger = getLogger('AvatarImage');

import {AVATAR_SIZE} from '.';

interface AvatarImageProps {
  assetRepository?: AssetRepository;
  avatarAlt: string;
  avatarSize: AVATAR_SIZE;
  backgroundColor?: string;
  borderRadius?: string;
  devicePixelRatio?: number;
  isGrey?: boolean;
  mediumPicture: AssetRemoteData;
  previewPicture: AssetRemoteData;
}

const AvatarImage: React.FunctionComponent<AvatarImageProps> = ({
  assetRepository = container.resolve(AssetRepository),
  avatarAlt,
  avatarSize,
  backgroundColor = 'currentColor',
  borderRadius = '50%',
  devicePixelRatio = window.devicePixelRatio,
  isGrey = false,
  mediumPicture,
  previewPicture,
}) => {
  const [avatarImage, setAvatarImage] = useState('');
  const [showTransition, setShowTransition] = useState(false);
  const [avatarLoadingBlocked, setAvatarLoadingBlocked] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!avatarLoadingBlocked && isVisible) {
      setAvatarLoadingBlocked(true);

      const isSmall = ![AVATAR_SIZE.LARGE, AVATAR_SIZE.X_LARGE].includes(avatarSize);
      const loadHiRes = !isSmall && devicePixelRatio > 1;
      const pictureResource: AssetRemoteData = loadHiRes ? mediumPicture : previewPicture;

      (async () => {
        if (pictureResource) {
          const isCached = pictureResource.downloadProgress === 100;
          setShowTransition(!isCached && !isSmall);
          try {
            const url = await assetRepository.getObjectUrl(pictureResource);
            if (url) {
              setAvatarImage(url);
            }
            setAvatarLoadingBlocked(false);
          } catch (error) {
            logger.development.warn('Failed to load avatar picture', error);
          }
        } else {
          setAvatarLoadingBlocked(false);
        }
      })();
    }
  }, [previewPicture, mediumPicture, avatarSize, isVisible]);

  const transitionImageStyles: Record<string, CSSObject> = {
    entered: {opacity: 1, transform: 'scale(1)'},
    entering: {opacity: 1, transform: 'scale(1)'},
  };

  return (
    <InViewport onVisible={() => setIsVisible(true)}>
      <Transition in={!!avatarImage} timeout={showTransition ? 700 : 0}>
        {(state: string) => {
          return (
            <img
              css={{
                ...CSS_FILL_PARENT,
                backgroundColor,
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
              alt={avatarAlt}
            />
          );
        }}
      </Transition>
    </InViewport>
  );
};

export {AvatarImage};
