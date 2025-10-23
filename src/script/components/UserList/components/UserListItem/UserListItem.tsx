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

import React, {ChangeEvent, useId} from 'react';

import {TabIndex, Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {UserStatusBadges} from 'Components/Badge';
import {ParticipantItemContent} from 'Components/ParticipantItemContent';
import {listItem, listWrapper} from 'Components/ParticipantItemContent/ParticipantItem.styles';
import {UserlistMode} from 'Components/UserList';
import {useUserName} from 'Components/UserName';
import {User} from 'Repositories/entity/User';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {capitalizeFirstChar} from 'Util/StringUtil';

interface UserListItemProps {
  groupId?: string;
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
  showArrow: boolean;
}

export const UserListItem = ({
  groupId,
  canSelect,
  customInfo,
  external,
  hideInfo,
  isHighlighted,
  isSelected,
  mode = UserlistMode.DEFAULT,
  noInteraction,
  noUnderline = false,
  user,
  onClick,
  onKeyDown,
}: UserListItemProps) => {
  const checkboxId = useId();

  const {isDirectGuest, expirationText} = useKoSubscribableChildren(user, ['isDirectGuest', 'expirationText']);

  const {isMe: isSelf, isFederated} = user;
  const isTemporaryGuest = user.isTemporaryGuest();
  const isAvailable = user.isAvailable();

  const hasUsernameInfo = !hideInfo && !customInfo && !isTemporaryGuest;
  const isOthersMode = mode === UserlistMode.OTHERS;

  const selfString = `(${capitalizeFirstChar(t('conversationYouNominative'))})`;

  const userName = useUserName(user);

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
    if (!isAvailable) {
      return user.domain;
    }

    return user.handle;
  };

  const contentInfoText = getContentInfoText();

  const RenderParticipant = () => {
    return (
      <div css={listItem(noInteraction)} data-uie-name="item-user" data-uie-value={userName}>
        <Avatar avatarSize={AVATAR_SIZE.SMALL} participant={user} aria-hidden="true" css={{margin: '0 16px'}} />

        <ParticipantItemContent
          groupId={groupId}
          participant={user}
          shortDescription={contentInfoText}
          {...(isSelf && {selfString})}
          hasUsernameInfo={hasUsernameInfo}
        />

        <UserStatusBadges
          config={{
            guest: !isOthersMode && isDirectGuest && !isFederated,
            federated: isFederated,
            external,
          }}
        />
      </div>
    );
  };

  const dataUieValues = {
    'data-uie-name': 'highlighted',
    'data-uie-value': isHighlighted,
  };

  return (
    <>
      {canSelect ? (
        <div
          aria-label={t('accessibility.openConversation', {name: userName})}
          css={listWrapper({isHighlighted, noUnderline, noInteraction})}
        >
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
          aria-label={t('accessibility.openConversation', {name: userName})}
          css={listWrapper({isHighlighted, noUnderline})}
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
