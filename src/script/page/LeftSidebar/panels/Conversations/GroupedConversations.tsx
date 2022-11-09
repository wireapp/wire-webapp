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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {useKoSubscribableChildren} from 'Util/ComponentUtil';

import {GroupedConversationsFolder} from './GroupedConversationsFolder';
import {useFolderState} from './state';

import {CallState} from '../../../../calling/CallState';
import {
  ConversationLabel,
  ConversationLabelRepository,
  createLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../../../conversation/ConversationLabelRepository';
import type {ConversationRepository} from '../../../../conversation/ConversationRepository';
import {ConversationState} from '../../../../conversation/ConversationState';
import type {Conversation} from '../../../../entity/Conversation';

const useLabels = (conversationLabelRepository: ConversationLabelRepository) => {
  const {labels: conversationLabels} = useKoSubscribableChildren(conversationLabelRepository, ['labels']);
  const [labels, setLabels] = useState<ConversationLabel[]>(conversationLabels);

  useEffect(() => {
    const updateLabels = () => setLabels([...(conversationLabels ?? [])]);
    updateLabels();
    const labelsSubscriptions = conversationLabels?.map(l => l.conversations.subscribe(updateLabels));

    return () => labelsSubscriptions?.forEach(l => l.dispose());
  }, [conversationLabels, conversationLabels?.length]);

  return labels;
};

export interface GroupedConversationsProps {
  callState: CallState;
  conversationRepository: ConversationRepository;
  conversationState: ConversationState;
  hasJoinableCall: (conversationId: QualifiedId) => boolean;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  onJoinCall: (conversationEntity: Conversation) => void;
  openContextMenu: (conversation: Conversation, event: MouseEvent | React.MouseEvent<Element, MouseEvent>) => void;
}

const GroupedConversations: React.FC<GroupedConversationsProps> = ({
  conversationRepository,
  hasJoinableCall,
  isSelectedConversation,
  onJoinCall,
  openContextMenu,
  conversationState = container.resolve(ConversationState),
  callState = container.resolve(CallState),
}) => {
  const {conversationLabelRepository} = conversationRepository;
  const {conversations_unarchived: conversations} = useKoSubscribableChildren(conversationState, [
    'conversations_unarchived',
  ]);

  useKoSubscribableChildren(callState, ['activeCalls']);

  const expandedFolders = useFolderState(state => state.expandedFolders);
  const toggleFolder = useFolderState(state => state.toggleFolder);

  useLabels(conversationLabelRepository);

  const favorites = conversationLabelRepository.getFavorites(conversations);
  const groups = conversationLabelRepository.getGroupsWithoutLabel(conversations);
  const contacts = conversationLabelRepository.getContactsWithoutLabel(conversations);
  const custom = conversationLabelRepository
    .getLabels()
    .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
    .filter(({conversations}) => !!conversations().length);

  const folders = [
    ...(favorites.length > 0 ? [createLabelFavorites(favorites)] : []),
    ...(groups.length > 0 ? [createLabelGroups(groups)] : []),
    ...(contacts.length > 0 ? [createLabelPeople(contacts)] : []),
    ...custom,
  ];

  return (
    <ul className="conversation-folder-list">
      {folders.map(folder => (
        <GroupedConversationsFolder
          key={`${folder.id}-${folder.conversations().length}`}
          folder={folder}
          toggle={toggleFolder}
          onJoinCall={onJoinCall}
          expandedFolders={expandedFolders}
          hasJoinableCall={hasJoinableCall}
          isSelectedConversation={isSelectedConversation}
          openContextMenu={openContextMenu}
        />
      ))}
    </ul>
  );
};

export {GroupedConversations};
