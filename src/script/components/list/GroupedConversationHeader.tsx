/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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
import cx from 'classnames';

import {registerReactComponent} from 'Util/ComponentUtil';

import type {ConversationLabel} from '../../conversation/ConversationLabelRepository';
import Icon from '../Icon';

export interface GroupedConversationHeaderProps {
  conversationLabel: ConversationLabel;
  isOpen: boolean;
}

const GroupedConversationHeader: React.FC<GroupedConversationHeaderProps> = ({conversationLabel, isOpen}) => {
  const badge = conversationLabel.conversations().filter(conversation => conversation.hasUnread()).length;

  return (
    <div
      className={cx('conversation-folder__head', {'conversation-folder__head--open': isOpen})}
      data-uie-name="conversation-folder-head"
    >
      <div className="disclose-icon">
        <Icon.Disclose />
      </div>
      <span className="conversation-folder__head__name">{conversationLabel.name}</span>
      {badge > 0 && (
        <span className="cell-badge-dark conversation-folder__head__badge" data-uie-name="conversation-folder-badge">
          {badge}
        </span>
      )}
    </div>
  );
};

export default GroupedConversationHeader;

registerReactComponent('grouped-conversation-header', {
  component: GroupedConversationHeader,
  template: '<div data-bind="react: {conversationLabel, isOpen: ko.unwrap(isOpen)}"></div>',
});
