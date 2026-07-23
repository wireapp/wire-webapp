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

import {conversationsListHandleStyles} from 'src/script/page/leftSidebar/panels/conversations/conversations.styles';
import {useApplicationContext} from 'src/script/page/rootProvider';

type ConversationListCollapseHandleProps = {
  isCollapsed: boolean;
  panelId: string;
  onToggle: () => void;
};

export const ConversationListCollapseHandle = ({
  isCollapsed,
  panelId,
  onToggle,
}: ConversationListCollapseHandleProps) => {
  const {translate} = useApplicationContext();

  return (
    <button
      type="button"
      className="conversations-list-handle"
      css={conversationsListHandleStyles}
      onClick={onToggle}
      aria-label={translate(
        isCollapsed ? 'accessibility.conversationListExpand' : 'accessibility.conversationListCollapse',
      )}
      aria-expanded={!isCollapsed}
      aria-controls={panelId}
      data-uie-name="toggle-conversation-list"
    />
  );
};
