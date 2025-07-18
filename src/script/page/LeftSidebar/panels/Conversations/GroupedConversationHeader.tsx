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

import React, {useEffect, useState} from 'react';

import cx from 'classnames';

import * as Icon from 'Components/Icon';
import type {ConversationLabel} from 'Repositories/conversation/ConversationLabelRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';

export interface GroupedConversationHeaderProps {
  conversationLabel: ConversationLabel;
  isOpen: boolean;
  onClick?: () => void;
}

const GroupedConversationHeader: React.FC<GroupedConversationHeaderProps> = ({onClick, conversationLabel, isOpen}) => {
  const {conversations} = useKoSubscribableChildren(conversationLabel, ['conversations']);
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    const updateBadge = () => setBadge(conversations.filter(conversation => conversation.hasUnread()).length);
    const unreadSubscriptions = conversations?.map(c => c.hasUnread.subscribe(updateBadge));
    updateBadge();

    return () => unreadSubscriptions?.forEach(s => s.dispose());
  }, [conversations?.length]);

  return (
    <button
      onClick={onClick}
      type="button"
      className={cx('conversation-folder__head', {'conversation-folder__head--open': isOpen})}
      data-uie-name="conversation-folder-head"
      aria-expanded={isOpen}
      aria-controls={conversationLabel.id}
      id={conversationLabel.id}
    >
      <span className="disclose-icon">
        <Icon.DiscloseIcon />
      </span>

      <h3 className="conversation-folder__head__name">{conversationLabel.name}</h3>

      {badge > 0 && (
        <span className="cell-badge-dark conversation-folder__head__badge" data-uie-name="conversation-folder-badge">
          {badge}
        </span>
      )}
    </button>
  );
};

export {GroupedConversationHeader};
