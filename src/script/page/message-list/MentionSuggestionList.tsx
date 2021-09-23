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

import React, {useState} from 'react';
import {User} from 'src/script/entity/User';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Icon from 'Components/Icon';
import cx from 'classnames';

type MentionSuggestionProps = {
  isSelected: boolean;
  onMouseEnter: (suggestion: User) => void;
  onSuggestionClick: (suggestion: User) => void;
  suggestion: User;
};

const MentionSuggestion: React.FunctionComponent<MentionSuggestionProps> = ({
  suggestion,
  onSuggestionClick,
  onMouseEnter,
  isSelected,
}) => {
  const {name, expirationRemainingText, isTemporaryGuest, isExternal, isGuest} = useKoSubscribableChildren(suggestion, [
    'name',
    'expirationRemainingText',
    'isTemporaryGuest',
    'isExternal',
    'isGuest',
  ]);
  return (
    <div
      onClick={event => {
        event.preventDefault();
        onSuggestionClick(suggestion);
      }}
      onMouseEnter={() => onMouseEnter(suggestion)}
      className={cx('mention-suggestion-list__item', isSelected && 'mention-suggestion-list__item--highlighted')}
      data-uie-name="item-mention-suggestion"
      data-uie-value={suggestion.id}
      data-uie-selected={isSelected}
    >
      <Avatar participant={suggestion} avatarSize={AVATAR_SIZE.XXX_SMALL} />
      <div className="mention-suggestion-list__item__name" data-uie-name="status-name">
        {name}
      </div>
      {isTemporaryGuest && (
        <div className="mention-suggestion-list__item__remaining" data-uie-name="status-remaining">
          {expirationRemainingText}
        </div>
      )}
      {isTemporaryGuest && (
        <div className="mention-suggestion-list__item__username" data-uie-name="status-username">
          {suggestion.handle}
        </div>
      )}
      {isExternal && (
        <Icon.External className="mention-suggestion-list__item__guest-badge" data-uie-name="status-external" />
      )}
      {isGuest && <Icon.Guest className="mention-suggestion-list__item__guest-badge" data-uie-name="status-guest" />}
    </div>
  );
};

type MentionSuggestionListProps = {
  onSelectionValidated: (data: User, element: HTMLInputElement) => void;
  suggestions: User[];
  targetInputSelector: string;
};
const MentionSuggestionList: React.FunctionComponent<MentionSuggestionListProps> = ({
  suggestions,
  onSelectionValidated,
}) => {
  const [isVisible] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [position] = useState({});

  const validateSuggestion = (suggestion: User) => {
    //$(this.targetInput).focus();
    onSelectionValidated(suggestion, this.targetInput);
  };
  const selectSuggestion = (suggestion: User): void => {
    setSelectedSuggestionIndex(suggestions.indexOf(suggestion));
  };
  if (!isVisible) {
    return null;
  }
  const orderedSuggestions = suggestions.slice().reverse();
  const selectedSuggestion = suggestions[selectedSuggestionIndex];
  return (
    <div
      className="conversation-input-bar-mention-suggestion"
      style={position}
      data-uie-name="list-mention-suggestions"
      data-bind="style: position"
    >
      <div className="mention-suggestion-list">
        {orderedSuggestions.map(suggestion => (
          <MentionSuggestion
            key={suggestion.id}
            suggestion={suggestion}
            isSelected={suggestion === selectedSuggestion}
            onSuggestionClick={validateSuggestion}
            onMouseEnter={selectSuggestion}
          />
        ))}
      </div>
    </div>
  );
};

export default MentionSuggestionList;

registerReactComponent('mention-suggestions', {
  bindings:
    'suggestions: ko.unwrap(suggestions), onSelectionValidated: onSelectionValidated, targetInputSelector: targetInputSelector',
  component: MentionSuggestionList,
});
