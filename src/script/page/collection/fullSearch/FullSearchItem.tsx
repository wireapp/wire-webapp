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

import React from 'react';

import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {formatDateShort} from 'Util/TimeUtil';
import {KEY} from 'Util/KeyboardUtil';

import type {Text} from '../../../entity/message/Text';
import type {ContentMessage} from '../../../entity/message/ContentMessage';

interface FullSearchItemProps {
  formatText: (text: string) => {matches: number; parts: string[]};
  message: ContentMessage;
  onClick: () => void;
}

const FullSearchItem: React.FC<FullSearchItemProps> = ({message, onClick, formatText}) => {
  const {user, timestamp} = useKoSubscribableChildren(message, ['user', 'timestamp']);
  const {name} = useKoSubscribableChildren(user, ['name']);
  const {parts, matches} = formatText((message.getFirstAsset() as Text).text);

  const handleSearchItemKeydown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === KEY.ENTER || event.key === KEY.SPACE) {
      onClick();
    }
    return true;
  };

  return (
    <div
      className="full-search__item"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleSearchItemKeydown}
      data-uie-name="full-search-item"
    >
      <div className="full-search__item__avatar">
        <Avatar participant={user} avatarSize={AVATAR_SIZE.X_SMALL} />
      </div>
      <div className="full-search__item__content">
        <div className="full-search__item__content__text ellipsis" data-uie-name="full-search-item-text">
          {parts.map((part, index) =>
            index % 2 ? (
              <mark key={index} className="full-search__marked" data-uie-name="full-search-item-mark">
                {part}
              </mark>
            ) : (
              part
            ),
          )}
        </div>
        <div className="full-search__item__content__info">
          <span className="font-weight-bold" data-uie-name="full-search-item-sender">
            {name}
          </span>
          <span data-uie-name="full-search-item-timestamp">{` ${formatDateShort(timestamp)}`}</span>
        </div>
      </div>
      {matches > 1 && (
        <div className="badge" data-uie-name="full-search-item-badge">
          {matches.toString()}
        </div>
      )}
    </div>
  );
};

export default FullSearchItem;
