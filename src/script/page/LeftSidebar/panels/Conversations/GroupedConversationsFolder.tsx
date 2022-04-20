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

import React from 'react';
import {css} from '@emotion/react';
import type {ConversationLabel} from 'src/script/conversation/ConversationLabelRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import ConversationListCell from 'Components/list/ConversationListCell';
import GroupedConversationHeader from './GroupedConversationHeader';
import {generateConversationUrl} from '../../../../router/routeGenerator';
import {createNavigate} from '../../../../router/routerBindings';
import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {Conversation} from 'src/script/entity/Conversation';

export interface GroupedConversationsFolderProps {
  expandedFolders: string[];
  folder: ConversationLabel;
  hasJoinableCall: (conversation: Conversation) => boolean;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  listViewModel: ListViewModel;
  onJoinCall: (conversationEntity: Conversation) => void;
  toggle: (folderId: string) => void;
}

const GroupedConversationsFolder: React.FC<GroupedConversationsFolderProps> = ({
  folder,
  toggle,
  onJoinCall,
  listViewModel,
  expandedFolders,
  hasJoinableCall,
  isSelectedConversation,
}) => {
  const isExpanded: boolean = expandedFolders.includes(folder.id);
  const {conversations} = useKoSubscribableChildren(folder, ['conversations']);
  const makeOnClick = (conversationId: string, domain: string | null) =>
    createNavigate(generateConversationUrl(conversationId, domain));

  return (
    <li className="conversation-folder" data-uie-name="conversation-folder" data-uie-value={folder.name}>
      <GroupedConversationHeader onClick={() => toggle(folder.id)} conversationLabel={folder} isOpen={isExpanded} />
      <ul css={css({listStyle: 'none', padding: 0})}>
        {isExpanded &&
          conversations.map(conversation => (
            <ConversationListCell
              dataUieName="item-conversation"
              key={conversation.id}
              onClick={makeOnClick(conversation.id, conversation.domain)}
              rightClick={(_, event) => listViewModel.onContextMenu(conversation, event)}
              conversation={conversation}
              showJoinButton={hasJoinableCall(conversation)}
              isSelected={isSelectedConversation}
              onJoinCall={onJoinCall}
            />
          ))}
      </ul>
    </li>
  );
};

export default GroupedConversationsFolder;
