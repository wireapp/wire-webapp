/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {EVERYONE_MENTION_VALUE} from '../../../../../../message/mentionEntity';
import {useApplicationContext} from '../../../../../../page/rootProvider';
import {TabIndex} from '../../../../../../uiKit/utils/enums';
import {handleKeyDown, KEY} from '../../../../../../util/keyboardUtil';
import * as Icon from '../../../../../icon';

type EveryoneMentionSuggestionsItemProps = {
  isSelected: boolean;
  onMouseEnter: () => void;
  onSuggestionClick: () => void;
};

const EveryoneMentionSuggestionsItemComponent: React.ForwardRefRenderFunction<
  HTMLDivElement,
  EveryoneMentionSuggestionsItemProps
> = ({isSelected, onMouseEnter, onSuggestionClick}, ref) => {
  const {translate} = useApplicationContext();
  const onClick = (event: React.UIEvent): void => {
    event.preventDefault();
    onSuggestionClick();
  };

  return (
    <div
      role="button"
      tabIndex={TabIndex.FOCUSABLE}
      onClick={onClick}
      onKeyDown={event => {
        return handleKeyDown({
          event,
          callback: () => {
            return onClick(event);
          },
          keys: [KEY.ENTER, KEY.SPACE],
        });
      }}
      onMouseEnter={onMouseEnter}
      className={cx('mention-suggestion-list__item', {'mention-suggestion-list__item--highlighted': isSelected})}
      data-uie-name="item-mention-suggestion-everyone"
      data-uie-selected={isSelected}
      ref={ref}
    >
      <span className="mention-suggestion-list__item__avatar mention-suggestion-list__item__everyone-icon">
        <Icon.PeopleIcon />
      </span>
      <div className="mention-suggestion-list__item__name" data-uie-name="status-name">
        {`@${EVERYONE_MENTION_VALUE}`}
      </div>
      <div className="mention-suggestion-list__item__username" data-uie-name="status-description">
        {translate('mentionEveryoneDescription')}
      </div>
    </div>
  );
};

export const EveryoneMentionSuggestionsItem = forwardRef(EveryoneMentionSuggestionsItemComponent);
