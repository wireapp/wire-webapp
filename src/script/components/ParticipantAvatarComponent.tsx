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
import {COLOR} from '@wireapp/react-ui-kit';

import {getFirstChar} from 'Util/StringUtil';
import {CSS_FILL_PARENT, CSS_FLEX_CENTER, CSS_ICON, CSS_SQUARE} from 'Util/CSSMixin';

import {User} from '../entity/User';
import {ServiceEntity} from '../integration/ServiceEntity';
import {AssetRemoteData} from '../assets/AssetRemoteData';
import {AssetRepository} from '../assets/AssetRepository';
import {container} from 'tsyringe';
import {registerReactComponent} from 'Util/ComponentUtil';
import SVGProvider from '../auth/util/SVGProvider';

export enum AVATAR_SIZE {
  LARGE = 'avatar-l',
  MEDIUM = 'avatar-m',
  SMALL = 'avatar-s',
  X_LARGE = 'avatar-xl',
  X_SMALL = 'avatar-xs',
  XX_SMALL = 'avatar-xxs',
  XXX_SMALL = 'avatar-xxxs',
}

enum STATE {
  BLOCKED = 'blocked',
  IGNORED = 'ignored',
  NONE = '',
  PENDING = 'pending',
  SELECTED = 'selected',
  SELF = 'self',
  UNKNOWN = 'unknown',
}

const DIAMETER = {
  [AVATAR_SIZE.LARGE]: 72,
  [AVATAR_SIZE.MEDIUM]: 40,
  [AVATAR_SIZE.SMALL]: 28,
  [AVATAR_SIZE.X_LARGE]: 200,
  [AVATAR_SIZE.X_SMALL]: 24,
  [AVATAR_SIZE.XX_SMALL]: 20,
  [AVATAR_SIZE.XXX_SMALL]: 16,
};

const INITIALS_SIZE = {
  [AVATAR_SIZE.LARGE]: '24px',
  [AVATAR_SIZE.MEDIUM]: '16px',
  [AVATAR_SIZE.SMALL]: '11px',
  [AVATAR_SIZE.X_LARGE]: '32px',
  [AVATAR_SIZE.X_SMALL]: '11px',
  [AVATAR_SIZE.XX_SMALL]: '11px',
  [AVATAR_SIZE.XXX_SMALL]: '8px',
};

export interface ParticipantAvatarProps {
  assetRepository: AssetRepository;
  clickHandler?: (participant: User, target: Node) => void;
  noBadge?: boolean;
  noFilter?: boolean;
  participant: User;
  size?: AVATAR_SIZE;
}
interface AvatarImageProps {
  assetRepository: AssetRepository;
  borderRadius?: string;
  isGrey?: boolean;
  participant: User;
  size: AVATAR_SIZE;
}

interface AvatarInitialsProps {
  color?: string;
  initials: string;
  size: AVATAR_SIZE;
}

interface AvatarBorderProps {
  borderRadius?: string;
}

interface UserAvatarProps {
  assetRepository: AssetRepository;
  noBadge: boolean;
  noFilter: boolean;
  participant: User;
  size: AVATAR_SIZE;
  state: STATE;
}

interface ServiceAvatarProps {
  assetRepository: AssetRepository;
  participant: User;
  size: AVATAR_SIZE;
}

interface AvatarBackgroundProps {
  backgroundColor?: string;
  borderRadius?: string;
}

const shouldShowBadge = (size: AVATAR_SIZE, state: STATE): boolean => {
  const isTooSmall = [AVATAR_SIZE.X_SMALL, AVATAR_SIZE.XX_SMALL, AVATAR_SIZE.XXX_SMALL].includes(size);
  const isBadgeState = [STATE.PENDING, STATE.BLOCKED].includes(state);
  return !isTooSmall && isBadgeState;
};

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

const AvatarInitials: React.FunctionComponent<AvatarInitialsProps> = ({size, initials, color = '#fff'}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      color,
      fontSize: INITIALS_SIZE[size],
      lineHeight: `${DIAMETER[size]}px`,
      textAlign: 'center',
      userSelect: 'none',
    }}
    data-uie-name="element-avatar-initials"
  >
    {size === AVATAR_SIZE.X_SMALL ? getFirstChar(initials) : initials}
  </div>
);

const AvatarBackground: React.FunctionComponent<AvatarBackgroundProps> = ({
  borderRadius = '50%',
  backgroundColor = 'currentColor',
}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      backgroundColor,
      borderRadius,
      transform: 'scale(0.9916)',
    }}
  />
);

const AvatarBorder: React.FunctionComponent<AvatarBorderProps> = ({borderRadius = '50%'}) => (
  <div
    css={{
      ...CSS_FILL_PARENT,
      border: '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius,
    }}
  />
);

interface AvatarBadgeProps {
  state: STATE;
}

const AvatarBadge: React.FunctionComponent<AvatarBadgeProps> = ({state}) => {
  const icons: Record<string, string> = {
    [STATE.PENDING]: '\\e165',
    [STATE.BLOCKED]: '\\e104',
  };
  return (
    <div
      css={{
        ...CSS_FILL_PARENT,
        ...CSS_FLEX_CENTER,
        '&::before': {
          ...CSS_ICON(icons[state]),
        },
        backgroundColor: 'rgba(0, 0, 0, .56)',
        borderRadius: '50%',
        color: '#fff',
      }}
      data-uie-name="element-avatar-user-badge-icon"
    />
  );
};

const ServiceAvatar: React.FunctionComponent<ServiceAvatarProps> = ({assetRepository, participant, size}) => {
  return (
    <>
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
          width={32}
          height={32}
          css={{
            '& > path': {
              fill: 'var(--background-fade-24)',
            },
            width: [AVATAR_SIZE.LARGE, AVATAR_SIZE.X_LARGE].includes(size) ? '100%' : '60%',
          }}
          dangerouslySetInnerHTML={{__html: SVGProvider['service-icon']?.documentElement?.innerHTML}}
        ></svg>
      </div>
      <AvatarImage assetRepository={assetRepository} participant={participant} borderRadius="20%" size={size} />
      <AvatarBorder borderRadius="20%" />
    </>
  );
};

const TemporaryGuestAvatar: React.FunctionComponent<UserAvatarProps> = ({
  assetRepository,
  size,
  participant,
  noBadge,
  noFilter,
  state,
}) => {
  const borderScale = 0.9916;
  const finalBorderWidth = size === AVATAR_SIZE.X_LARGE ? 4 : 1;
  const remainingTime = participant.expirationRemaining();
  const normalizedRemainingTime = remainingTime / User.CONFIG.TEMPORARY_GUEST.LIFETIME;

  const borderWidth = (finalBorderWidth / DIAMETER[size]) * 32;
  const borderRadius = (16 - borderWidth / 2) * borderScale;
  const timerLength = borderRadius * Math.PI * 2;
  const timerOffset = timerLength * (normalizedRemainingTime - 1);
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);

  return (
    <>
      <AvatarBackground />
      <AvatarInitials color="var(--background)" size={size} initials={participant.initials()} />
      <AvatarImage assetRepository={assetRepository} participant={participant} size={size} isGrey={isImageGrey} />
      {!noBadge && shouldShowBadge(size, state) && <AvatarBadge state={state} />}
      {!isImageGrey && <AvatarBorder />}
      <svg
        css={{
          ...CSS_FILL_PARENT,
          position: 'absolute',
        }}
        data-uie-name="element-avatar-guest-expiration-circle"
        viewBox="0 0 32 32"
        stroke={participant.accent_color()}
      >
        <circle
          cx="16"
          cy="16"
          transform="rotate(-90 16 16)"
          fill="none"
          strokeDasharray={timerLength}
          strokeDashoffset={timerOffset}
          r={borderRadius}
          strokeWidth={borderWidth}
        />
      </svg>
    </>
  );
};

const UserAvatar: React.FunctionComponent<UserAvatarProps> = ({
  assetRepository,
  participant,
  size,
  noBadge,
  noFilter,
  state,
}) => {
  const isImageGrey = !noFilter && [STATE.BLOCKED, STATE.IGNORED, STATE.PENDING, STATE.UNKNOWN].includes(state);
  return (
    <>
      <AvatarBackground backgroundColor={state === STATE.UNKNOWN ? COLOR.GRAY : undefined} />
      <AvatarInitials size={size} initials={participant.initials()} />
      <AvatarImage assetRepository={assetRepository} participant={participant} size={size} isGrey={isImageGrey} />
      {!noBadge && shouldShowBadge(size, state) && <AvatarBadge state={state} />}
      {!isImageGrey && <AvatarBorder />}
    </>
  );
};

const ParticipantAvatar: React.FunctionComponent<ParticipantAvatarProps> = ({
  assetRepository = container.resolve(AssetRepository),
  participant,
  clickHandler,
  noBadge = false,
  noFilter = false,
  size = AVATAR_SIZE.LARGE,
}) => {
  const isUser = participant instanceof User && !participant.isService && !participant.isTemporaryGuest();
  const isService = participant instanceof ServiceEntity || participant.isService;
  const isTemporaryGuest = !isService && participant.isTemporaryGuest();

  const avatarState = (() => {
    switch (true) {
      case isService:
        return STATE.NONE;
      case participant.isMe:
        return STATE.SELF;
      case participant.isTeamMember():
        return STATE.NONE;
      case participant.isBlocked():
        return STATE.BLOCKED;
      case participant.isRequest():
        return STATE.PENDING;
      case participant.isIgnored():
        return STATE.IGNORED;
      case participant.isCanceled() || participant.isUnknown():
        return STATE.UNKNOWN;
      default:
        return STATE.NONE;
    }
  })();

  const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (typeof clickHandler === 'function') {
      clickHandler(participant, (event.currentTarget as Node).parentNode);
    }
  };

  return (
    <div
      title={participant.name()}
      data-uie-name={`${isUser ? 'user' : 'service'}-avatar`}
      onClick={onClick}
      css={{
        ...CSS_SQUARE(DIAMETER[size]),
        color: isService ? '#fff' : isTemporaryGuest ? 'var(--background-fade-8)' : participant.accent_color(),
        display: 'inline-block',
        overflow: 'hidden',
        position: 'relative',
        transform: 'translateZ(0)',
        userSelect: 'none',
      }}
    >
      {isUser && (
        <UserAvatar
          size={size}
          assetRepository={assetRepository}
          noBadge={noBadge}
          noFilter={noFilter}
          participant={participant}
          state={avatarState}
        />
      )}
      {isService && <ServiceAvatar assetRepository={assetRepository} size={size} participant={participant} />}
      {isTemporaryGuest && (
        <TemporaryGuestAvatar
          assetRepository={assetRepository}
          noBadge={noBadge}
          noFilter={noFilter}
          participant={participant}
          state={avatarState}
          size={size}
        />
      )}
    </div>
  );
};

export default ParticipantAvatar;

registerReactComponent('participant-avatar', {
  component: ParticipantAvatar,
  optionalParams: ['size', 'click', 'noBadge', 'noFilter'],
  template:
    '<span data-bind="react: {participant: ko.unwrap(participant), size, clickHandler: click, noBadge, noFilter}"></span>',
});
