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

import React, {ChangeEvent, useId, useState} from 'react';

import {TabIndex} from '@wireapp/react-ui-kit/lib/types/enums';
import cx from 'classnames';

import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {ParticipantItemContent} from 'Components/ParticipantItemContent';
import {UserBadges} from 'Components/UserBadges';
import {UserlistMode} from 'Components/UserList';
import {InViewport} from 'Components/utils/InViewport';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {User} from '../../../../entity/User';

export interface UserListItemProps {
  canSelect: boolean;
  customInfo?: string;
  external: boolean;
  hideInfo?: boolean;
  isHighlighted: boolean;
  isSelected: boolean;
  isSelfVerified: boolean;
  mode: UserlistMode;
  noInteraction: boolean;
  noUnderline: boolean;
  onClick: (user: User, event: MouseEvent | ChangeEvent) => void;
  onKeyDown: (user: User, event: KeyboardEvent) => void;
  user: User;
  selfInTeam: boolean;
  showArrow: boolean;
}

const UserListItem = ({
  canSelect,
  customInfo,
  external,
  hideInfo,
  isHighlighted,
  isSelected,
  isSelfVerified = false,
  mode = UserlistMode.DEFAULT,
  noInteraction,
  noUnderline = false,
  user,
  selfInTeam,
  onClick,
  onKeyDown,
}: UserListItemProps) => {
  const checkboxId = useId();
  const [isInViewport, setIsInViewport] = useState(false);

  const {
    is_verified: isVerified,
    isDirectGuest,
    availability,
    expirationText,
    name: userName,
  } = useKoSubscribableChildren(user, ['isDirectGuest', 'is_verified', 'availability', 'expirationText', 'name']);

  const {isMe: isSelf, isFederated} = user;
  const isTemporaryGuest = user.isTemporaryGuest();

  const hasUsernameInfo = !hideInfo && !customInfo && !isTemporaryGuest;
  const isOthersMode = mode === UserlistMode.OTHERS;

  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  const getContentInfoText = () => {
    if (customInfo) {
      return customInfo;
    }

    if (hideInfo) {
      return '';
    }

    if (isTemporaryGuest) {
      return expirationText;
    }

    return user.handle;
  };

  const contentInfoText = getContentInfoText();

  const RenderParticipant = () => {
    return (
      <InViewport className="participant-item" onVisible={() => setIsInViewport(true)}>
        {isInViewport && (
          <>
            <div className="participant-item__image">
              <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={user} aria-hidden="true" />
            </div>

            <ParticipantItemContent
              name={`${userName} ${noInteraction}`}
              shortDescription={contentInfoText}
              selfInTeam={selfInTeam}
              availability={availability}
              {...(isSelf && {selfString})}
              hasUsernameInfo={hasUsernameInfo}
            />

            <UserBadges
              config={{
                guest: !isOthersMode && isDirectGuest,
                federated: isFederated,
                external,
                verified: isSelfVerified && isVerified,
              }}
            />
          </>
        )}
      </InViewport>
    );
  };

  const dataUieValues = {
    'data-uie-name': 'item-user',
    'data-uie-value': userName,
  };

  const commonClassName = cx('participant-item-wrapper', {
    highlighted: isHighlighted,
    'no-interaction': noInteraction,
    'no-underline': noUnderline,
  });

  return (
    <>
      {canSelect ? (
        <div aria-label={t('accessibility.openConversation', userName)} className={commonClassName}>
          <Checkbox
            checked={isSelected}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onClick(user, event)}
            id={checkboxId}
            labelBeforeCheckbox
            aligncenter={false}
            outlineOffset="0"
          >
            <CheckboxLabel htmlFor={checkboxId}>
              <div {...dataUieValues}>
                <RenderParticipant />
              </div>
            </CheckboxLabel>
          </Checkbox>
        </div>
      ) : (
        <div
          tabIndex={TabIndex.FOCUSABLE}
          role="button"
          aria-label={t('accessibility.openConversation', userName)}
          className={commonClassName}
          {...(!noInteraction && {
            onClick: event => onClick(user, event.nativeEvent),
            onKeyDown: event => onKeyDown(user, event.nativeEvent),
          })}
          {...dataUieValues}
        >
          <RenderParticipant />
        </div>
      )}
    </>
  );
};

export {UserListItem};
