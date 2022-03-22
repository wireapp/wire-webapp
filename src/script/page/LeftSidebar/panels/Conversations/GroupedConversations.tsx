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
import {container} from 'tsyringe';

import type {ConversationRepository} from '../../../../conversation/ConversationRepository';
import type {Conversation} from '../../../../entity/Conversation';
import {
  ConversationLabel,
  ConversationLabelRepository,
  createLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../../../conversation/ConversationLabelRepository';

import {ListViewModel} from 'src/script/view_model/ListViewModel';
import {ConversationState} from '../../../../conversation/ConversationState';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import GroupedConversationsFolder from './GroupedConversationsFolder';
import {CallState} from '../../../../calling/CallState';
import {QualifiedId} from '@wireapp/api-client/src/user';
import {useFolderState} from './state';

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
  listViewModel: ListViewModel;
  onJoinCall: (conversationEntity: Conversation) => void;
}

const GroupedConversations: React.FC<GroupedConversationsProps> = ({
  conversationRepository,
  hasJoinableCall,
  isSelectedConversation,
  onJoinCall,
  listViewModel,
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
    favorites.length && createLabelFavorites(favorites),
    groups.length && createLabelGroups(groups),
    contacts.length && createLabelPeople(contacts),
    ...custom,
  ].filter(Boolean);

  return (
    <ul className="conversation-folder-list">
      {folders.map(folder => (
        <GroupedConversationsFolder
          key={`${folder.id}-${folder.conversations().length}`}
          folder={folder}
          toggle={toggleFolder}
          onJoinCall={onJoinCall}
          listViewModel={listViewModel}
          expandedFolders={expandedFolders}
          hasJoinableCall={hasJoinableCall}
          isSelectedConversation={isSelectedConversation}
        />
      ))}
    </ul>
  );
};

export default GroupedConversations;
