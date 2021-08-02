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

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {Conversation} from '../../entity/Conversation';
import {
  ConversationLabel,
  createLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../conversation/ConversationLabelRepository';
import {generateConversationUrl} from '../../router/routeGenerator';
import {createNavigate} from '../../router/routerBindings';

import './GroupedConversationHeader';
import GroupedConversationHeader from './GroupedConversationHeader';
import ConversationListCell from './ConversationListCell';
import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {registerReactComponent} from 'Util/ComponentUtil';

export interface GroupedConversationsProps {
  conversationRepository: ConversationRepository;
  expandedFolders: string[];
  hasJoinableCall: (conversationId: string) => boolean;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  isVisibleFunc: (top: number, bottom: number) => boolean;
  listViewModel: ListViewModel;
  onJoinCall: (conversationEntity: Conversation) => void;
  setExpandedFolders: (folders: string[]) => void;
}

const GroupedConversations: React.FC<GroupedConversationsProps> = ({
  conversationRepository,
  expandedFolders,
  hasJoinableCall,
  isSelectedConversation,
  isVisibleFunc,
  listViewModel,
  onJoinCall,
  setExpandedFolders,
}) => {
  const {conversationLabelRepository} = conversationRepository;
  const makeOnClick = (conversationId: string) => createNavigate(generateConversationUrl(conversationId));

  const folders = (() => {
    const folders: ConversationLabel[] = [];

    const favorites = conversationLabelRepository.getFavorites();
    if (favorites.length) {
      folders.push(createLabelFavorites(favorites));
    }

    const groups = conversationLabelRepository.getGroupsWithoutLabel();
    if (groups.length) {
      folders.push(createLabelGroups(groups));
    }

    const contacts = conversationLabelRepository.getContactsWithoutLabel();
    if (contacts.length) {
      folders.push(createLabelPeople(contacts));
    }

    const custom = conversationLabelRepository
      .getLabels()
      .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
      .filter(({conversations}) => !!conversations().length);
    folders.push(...custom);

    return folders;
  })();

  const isExpanded = (folderId: string): boolean => expandedFolders.includes(folderId);
  const toggle = (folderId: string): void => {
    if (isExpanded(folderId)) {
      setExpandedFolders(expandedFolders.filter(folder => folder !== folderId));
    } else {
      setExpandedFolders([...expandedFolders, folderId]);
    }
  };
  /*
   *  We need to calculate the offset from the top for the isVisibleFunc as we can't rely
   *  on the index of the conversation alone. We need to account for the folder headers and
   *  the height of the <conversation-list-cell>s of the previous open folders.
   */
  const getOffsetTop = (folder: ConversationLabel, conversation: Conversation) => {
    const folderHeaderHeight = 53;
    const firstFolderHeaderHeight = 33;
    const cellHeight = 56;

    const folderIndex = folders.indexOf(folder);
    const totalHeaderHeight = folderHeaderHeight * folderIndex + firstFolderHeaderHeight;
    const previousExpandedFolders = folders.slice(0, folderIndex).filter(({id}) => isExpanded(id));
    const previousCellsHeight = previousExpandedFolders.reduce(
      (height, {conversations}) => height + conversations.length * cellHeight,
      0,
    );
    const currentCellsHeight = folder.conversations.indexOf(conversation) * cellHeight;
    return totalHeaderHeight + previousCellsHeight + currentCellsHeight;
  };

  return (
    <>
      {folders.map(folder => (
        <div
          key={folder.id}
          className="conversation-folder"
          data-uie-name="conversation-folder"
          data-uie-value={folder.name}
        >
          <GroupedConversationHeader
            onClick={() => toggle(folder.id)}
            conversationLabel={folder}
            isOpen={isExpanded(folder.id)}
          />
          <div>
            {isExpanded(folder.id) &&
              folder
                .conversations()
                .map((conversation, index) => (
                  <ConversationListCell
                    key={conversation.id}
                    data-uie-name="item-conversation"
                    onClick={makeOnClick(conversation.id)}
                    rightClick={(_, event) => listViewModel.onContextMenu(conversation, event)}
                    conversation={conversation}
                    showJoinButton={hasJoinableCall(conversation.id)}
                    is_selected={isSelectedConversation}
                    onJoinCall={onJoinCall}
                    offsetTop={getOffsetTop(folder, conversation)}
                    index={index}
                    isVisibleFunc={isVisibleFunc}
                  />
                ))}
          </div>
        </div>
      ))}
    </>
  );
};

export default GroupedConversations;

registerReactComponent<GroupedConversationsProps>('grouped-conversations', {
  bindings:
    'expandedFolders: ko.unwrap(expandedFolders), setExpandedFolders: expandedFolders, conversationRepository, hasJoinableCall, isSelectedConversation, isVisibleFunc, listViewModel, onJoinCall',
  component: GroupedConversations,
});
