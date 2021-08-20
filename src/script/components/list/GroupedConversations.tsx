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

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {container} from 'tsyringe';

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {Conversation} from '../../entity/Conversation';
import {
  ConversationLabel,
  ConversationLabelRepository,
  createLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../conversation/ConversationLabelRepository';

import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {ConversationState} from '../../conversation/ConversationState';
import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import GroupedConversationsFolder from './GroupedConversationsFolder';

const useLabels = (conversationLabelRepository: ConversationLabelRepository) => {
  const {labels: conversationLabels} = useKoSubscribableChildren(conversationLabelRepository, ['labels']);
  const [labels, setLabels] = useState<ConversationLabel[]>(conversationLabels);

  useEffect(() => {
    if (!conversationLabels) {
      return setLabels([]);
    }
    const updateLabels = () => {
      setLabels([...conversationLabels]);
    };
    updateLabels();
    const labelsSubscriptions = labels?.map(l => l.conversations.subscribe(updateLabels));
    return () => {
      labelsSubscriptions?.forEach(l => l.dispose());
    };
  }, [conversationLabels?.length]);

  return labels;
};

export interface GroupedConversationsProps {
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  expandedFolders: string[];
  hasJoinableCall: (conversationId: string) => boolean;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  isVisibleFunc: (top: number, bottom: number) => boolean;
  listViewModel: ListViewModel;
  onJoinCall: (conversationEntity: Conversation) => void;
  setExpandedFolders: (folders: string[]) => void;
  toggle: (folderId: string) => void;
}

const GroupedConversations: React.FC<GroupedConversationsProps> = ({
  conversationRepository,
  expandedFolders,
  hasJoinableCall,
  isSelectedConversation,
  isVisibleFunc,
  onJoinCall,
  setExpandedFolders,
  listViewModel,
  conversationState = container.resolve(ConversationState),
}) => {
  const {conversationLabelRepository} = conversationRepository;
  const {conversations_unarchived: conversations} = useKoSubscribableChildren(conversationState, [
    'conversations_unarchived',
  ]);

  const labels = useLabels(conversationLabelRepository);
  const favorites = conversationLabelRepository.getFavorites(conversations);
  const groups = conversationLabelRepository.getGroupsWithoutLabel(conversations);
  const contacts = conversationLabelRepository.getContactsWithoutLabel(conversations);

  const folders = useMemo(() => {
    const folders: ConversationLabel[] = [];

    if (favorites.length) {
      folders.push(createLabelFavorites(favorites));
    }

    if (groups.length) {
      folders.push(createLabelGroups(groups));
    }

    if (contacts.length) {
      folders.push(createLabelPeople(contacts));
    }

    const custom = conversationLabelRepository
      .getLabels()
      .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
      .filter(({conversations}) => !!conversations().length);
    folders.push(...custom);

    return folders;
  }, [
    labels.map(label => label.name + label.conversations().length).join(''),
    favorites.length,
    groups.length,
    contacts.length,
    expandedFolders,
  ]);

  const isExpanded = useCallback((folderId: string): boolean => expandedFolders.includes(folderId), [expandedFolders]);
  const toggle = useCallback(
    (folderId: string): void => {
      if (isExpanded(folderId)) {
        setExpandedFolders(expandedFolders.filter(folder => folder !== folderId));
      } else {
        setExpandedFolders([...expandedFolders, folderId]);
      }
    },
    [expandedFolders],
  );

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
        <GroupedConversationsFolder
          key={folder.id}
          folder={folder}
          toggle={toggle}
          onJoinCall={onJoinCall}
          getOffsetTop={getOffsetTop}
          isVisibleFunc={isVisibleFunc}
          listViewModel={listViewModel}
          expandedFolders={expandedFolders}
          hasJoinableCall={hasJoinableCall}
          isSelectedConversation={isSelectedConversation}
        />
      ))}
    </>
  );
};

export default GroupedConversations;

registerReactComponent<GroupedConversationsProps>('grouped-conversations', {
  component: GroupedConversations,
  template:
    '<div data-bind="react: {expandedFolders: ko.unwrap(expandedFolders), setExpandedFolders: expandedFolders, conversationRepository, hasJoinableCall, isSelectedConversation, isVisibleFunc, listViewModel, onJoinCall}"></div>',
});
