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
import React, {useEffect, useState, useMemo} from 'react';

import {Logger, getLogger} from 'Util/Logger';
import {createRandomUuid} from 'Util/util';
import {getFirstChar} from 'Util/StringUtil';

import {viewportObserver} from '../ui/viewportObserver';
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

interface ParticipantAvatarParams {
  assetRepository: AssetRepository;
  click: (participant: User, target: Node) => void;
  delay?: number;
  participant?: ko.Observable<User> | User;
  selected?: () => any;
  size?: AVATAR_SIZE;
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
/*
export class ParticipantAvatarKnockout {
  avatarEnteredViewport: boolean;
  avatarLoadingBlocked: boolean;
  avatarType: ko.PureComputed<string>;
  borderRadius: number;
  borderWidth: number;
  cssClasses: ko.PureComputed<string>;
  delay: number;
  element: JQuery<HTMLElement>;
  initials: ko.PureComputed<string>;
  isService: ko.PureComputed<boolean>;
  isTemporaryGuest: ko.PureComputed<boolean>;
  isUser: ko.PureComputed<boolean>;
  logger: Logger;
  onClick: (data: {participant: User}, event: Event) => void;
  participant: ko.Observable<User>;
  participantSubscription: ko.Subscription;
  pictureSubscription: ko.Subscription;
  size: AVATAR_SIZE;
  state: ko.PureComputed<STATE>;
  timerLength: number;
  timerOffset: ko.PureComputed<number>;

  private readonly assetRepository: AssetRepository;

  constructor(
    {
      assetRepository = container.resolve(AssetRepository),
      participant,
      delay,
      size,
      selected,
      click,
    }: ParticipantAvatarParams,
    componentInfo: {element: HTMLElement},
  ) {
    this.logger = getLogger('ParticipantAvatar');
    this.assetRepository = assetRepository;

    const isParticipantObservable = typeof participant === 'function';
    this.participant = isParticipantObservable
      ? (participant as ko.Observable<User>)
      : ko.observable(participant as User);

    this.delay = delay;
    this.size = size || SIZE.LARGE;
    this.element = $(componentInfo.element);
    this.element.addClass(`${this.avatarType()} ${this.size}`);

    const borderScale = 0.9916;
    const finalBorderWidth = this.size === AVATAR_SIZE.X_LARGE ? 4 : 1;
    this.borderWidth = (finalBorderWidth / ParticipantAvatar.DIAMETER[this.size]) * 32;
    this.borderRadius = (16 - this.borderWidth / 2) * borderScale;
    this.timerLength = this.borderRadius * Math.PI * 2;

    this.timerOffset = ko.pureComputed(() => {
      if (this.isTemporaryGuest()) {
        const remainingTime = this.participant().expirationRemaining();
        const normalizedRemainingTime = remainingTime / User.CONFIG.TEMPORARY_GUEST.LIFETIME;
        return this.timerLength * (normalizedRemainingTime - 1);
      }
      return 0;
    });

    this.avatarLoadingBlocked = false;
    this.avatarEnteredViewport = false;

    this.dispose = this.dispose.bind(this);

    this.element.attr({
      id: createRandomUuid(),
      'user-id': this.participant().id,
    });

    this.initials = ko.pureComputed(() => {
      if (this.isService()) {
        return '';
      }

      return this.element.hasClass('avatar-xs')
        ? getFirstChar(this.participant().initials())
        : this.participant().initials();
    });

    const _loadAvatarPicture = async () => {
      this.element.find('.avatar-image').html('');
      this.element.removeClass('avatar-image-loaded avatar-loading-transition');
      if (!this.avatarLoadingBlocked) {
        this.avatarLoadingBlocked = true;

        const isSmall = this.size !== AVATAR_SIZE.LARGE && this.size !== AVATAR_SIZE.X_LARGE;
        const loadHiRes = !isSmall && window.devicePixelRatio > 1;
        const pictureResource: AssetRemoteData = loadHiRes
          ? this.participant().mediumPictureResource()
          : this.participant().previewPictureResource();

        if (pictureResource) {
          const isCached = pictureResource.downloadProgress() === 100;

          try {
            const url = await this.assetRepository.getObjectUrl(pictureResource);
            if (url) {
              const image = new Image();
              image.src = url;
              this.element.find('.avatar-image').html(image as any);
              this.element.addClass(`avatar-image-loaded ${isCached && isSmall ? '' : 'avatar-loading-transition'}`);
            }
            this.avatarLoadingBlocked = false;
          } catch (error) {
            this.logger.warn('Failed to load avatar picture.', error);
          }
        } else {
          this.avatarLoadingBlocked = false;
        }
      }
    };

    const _onInViewport = () => {
      this.avatarEnteredViewport = true;
      _loadAvatarPicture();
    };

    const _loadAvatarPictureIfVisible = () => {
      if (this.avatarEnteredViewport) {
        _loadAvatarPicture();
      }
    };

    viewportObserver.onElementInViewport(componentInfo.element, _onInViewport);

    this.pictureSubscription = this.participant().mediumPictureResource.subscribe(_loadAvatarPictureIfVisible);
    this.participantSubscription = this.participant.subscribe(_loadAvatarPictureIfVisible);
  }

  dispose() {
    viewportObserver.removeElement(this.element[0]);
    this.participantSubscription.dispose();
    this.pictureSubscription.dispose();
  }
}
*/
export interface ParticipantAvatarProps {
  assetRepository: AssetRepository;
  clickHandler?: (participant: User, target: Node) => void;
  delay?: number;
  participant: User;
  size?: AVATAR_SIZE;
}

const ParticipantAvatar: React.FunctionComponent<ParticipantAvatarProps> = ({
  assetRepository = container.resolve(AssetRepository),
  participant,
  clickHandler,
  size = AVATAR_SIZE.LARGE,
}) => {
  const [isUser, setIsUser] = useState(false);
  const [isService, setIsService] = useState(false);
  const [isTemporaryGuest, setIsTemporaryGuest] = useState(false);
  const [initials, setInitials] = useState('');
  const [timerLength, setTimerLength] = useState(0);
  const [timerOffset, setTimerOffset] = useState(0);
  const [borderRadius, setBorderRadius] = useState(0);
  const [borderWidth, setBorderWidth] = useState(0);
  const [avatarImage, setAvatarImage] = useState('');
  const [avatarLoadingBlocked, setAvatarLoadingBlocked] = useState(false);

  const loadAvatarPicture = async () => {
    if (!avatarLoadingBlocked) {
      setAvatarLoadingBlocked(true);

      const isSmall = size !== AVATAR_SIZE.LARGE && size !== AVATAR_SIZE.X_LARGE;
      const loadHiRes = !isSmall && window.devicePixelRatio > 1;
      const pictureResource: AssetRemoteData = loadHiRes
        ? participant.mediumPictureResource()
        : participant.previewPictureResource();

      if (pictureResource) {
        try {
          const url = await assetRepository.getObjectUrl(pictureResource);
          if (url) {
            setAvatarImage(url);
          }
          setAvatarLoadingBlocked(false);
        } catch (error) {
          console.warn('Failed to load avatar picture.', error);
        }
      } else {
        setAvatarLoadingBlocked(false);
      }
    }
  };

  useEffect(() => {
    loadAvatarPicture();
  }, [participant]);

  useEffect(() => {
    const _isUser = participant instanceof User && !participant.isService;
    const _isService = participant instanceof ServiceEntity || participant.isService;
    const _isTemporaryGuest = _isUser && participant.isTemporaryGuest();

    if (_isService) {
      setInitials('');
    } else if (size === AVATAR_SIZE.X_SMALL) {
      setInitials(getFirstChar(participant.initials()));
    } else {
      setInitials(participant.initials());
    }

    const borderScale = 0.9916;
    const finalBorderWidth = size === AVATAR_SIZE.X_LARGE ? 4 : 1;
    const _borderWidth = (finalBorderWidth / DIAMETER[size]) * 32;
    const _borderRadius = (16 - _borderWidth / 2) * borderScale;
    const _timerLength = _borderRadius * Math.PI * 2;

    if (_isTemporaryGuest) {
      const remainingTime = participant.expirationRemaining();
      const normalizedRemainingTime = remainingTime / User.CONFIG.TEMPORARY_GUEST.LIFETIME;
      setTimerOffset(_timerLength * (normalizedRemainingTime - 1));
    } else {
      setTimerOffset(0);
    }

    setIsUser(_isUser);
    setIsService(_isService);
    setIsTemporaryGuest(_isTemporaryGuest);

    setTimerLength(_timerLength);
    setBorderRadius(_borderRadius);
    setBorderWidth(_borderWidth);
  }, [participant]);

  const avatarState = useMemo(() => {
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
  }, [participant, isService]);

  const onClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (typeof clickHandler === 'function') {
      clickHandler(participant, (event.currentTarget as Node).parentNode);
    }
  };

  const avatarType = useMemo(() => `${isUser ? 'user' : 'service'}-avatar`, [isUser]);

  const cssClasses = useMemo(
    () =>
      isService
        ? 'accent-color-service'
        : isTemporaryGuest
        ? 'accent-color-temporary'
        : `accent-color-${participant.accent_id()} ${avatarState}`,
    [avatarState, participant, isService, isTemporaryGuest],
  );

  return (
    <div
      className={`participant-avatar ${avatarType} ${size} ${cssClasses}`}
      title={participant.name()}
      data-uie-name={avatarType}
      onClick={onClick}
      data-bind="attr: {delay: delay}"
    >
      <div className="avatar-background" />
      {isUser && (
        <div className="avatar-initials" data-uie-name="element-avatar-initials">
          {initials}
        </div>
      )}
      {isService && (
        <div className="avatar-service-placeholder" data-uie-name="element-avatar-service-icon">
          <svg
            width={32}
            height={32}
            dangerouslySetInnerHTML={{__html: SVGProvider['service-icon']?.documentElement?.innerHTML}}
          ></svg>
        </div>
      )}
      <div className="avatar-image avatar-image-loaded">
        {avatarImage && <img className="avatar-image" src={avatarImage} />}
      </div>
      {isUser && <div className="avatar-badge" data-uie-name="element-avatar-user-badge-icon" />}
      <div className="avatar-border" />
      {isTemporaryGuest && (
        <svg
          className="avatar-temporary-guest-border"
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
      )}
    </div>
  );
};

export default ParticipantAvatar;

registerReactComponent('participant-avatar', {
  component: ParticipantAvatar,
  optionalParams: ['size', 'click'],
  template: '<span data-bind="react: {participant: ko.unwrap(participant), size: size, clickHandler: click}"></span>',
});
