/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {forwardRef} from 'react';
import cx from 'classnames';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';

import {User} from '../../../entity/User';

type MentionSuggestionsItemProps = {
  isSelected: boolean;
  onMouseEnter: () => void;
  onSuggestionClick: () => void;
  suggestion: User;
};

const MentionSuggestionsItem: React.ForwardRefRenderFunction<HTMLDivElement, MentionSuggestionsItemProps> = (
  {suggestion, onSuggestionClick, onMouseEnter, isSelected},
  ref,
) => {
  const {name, expirationRemainingText, isTemporaryGuest, isExternal, isDirectGuest} = useKoSubscribableChildren(
    suggestion,
    ['name', 'expirationRemainingText', 'isTemporaryGuest', 'isExternal', 'isDirectGuest'],
  );
  return (
    <div
      onClick={event => {
        event.preventDefault();
        onSuggestionClick();
      }}
      onMouseEnter={onMouseEnter}
      className={cx('mention-suggestion-list__item', {'mention-suggestion-list__item--highlighted': isSelected})}
      data-uie-name="item-mention-suggestion"
      data-uie-value={suggestion.id}
      data-uie-selected={isSelected}
      ref={ref}
    >
      <Avatar
        participant={suggestion}
        avatarSize={AVATAR_SIZE.XXX_SMALL}
        className="mention-suggestion-list__item__avatar"
      />
      <div className="mention-suggestion-list__item__name" data-uie-name="status-name">
        {name}
      </div>
      {isTemporaryGuest ? (
        <div className="mention-suggestion-list__item__remaining" data-uie-name="status-remaining">
          {expirationRemainingText}
        </div>
      ) : (
        <div className="mention-suggestion-list__item__username" data-uie-name="status-username">
          {suggestion.handle}
        </div>
      )}
      {isExternal && (
        <Icon.External className="mention-suggestion-list__item__guest-badge" data-uie-name="status-external" />
      )}
      {suggestion.isFederated && (
        <Icon.Federation className="mention-suggestion-list__item__guest-badge" data-uie-name="status-federated" />
      )}
      {isDirectGuest && (
        <Icon.Guest className="mention-suggestion-list__item__guest-badge" data-uie-name="status-guest" />
      )}
    </div>
  );
};

export default forwardRef(MentionSuggestionsItem);
