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

import ko from 'knockout';

import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {Conversation} from 'src/script/entity/Conversation';
import {ConversationListViewModel} from 'src/script/view_model/list/ConversationListViewModel';
import {
  ConversationLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../conversation/ConversationLabel';
import {generateConversationUrl} from '../../router/routeGenerator';

interface GroupedConversationsParams {
  conversationRepository: ConversationRepository;
  listViewModel: ConversationListViewModel;
  hasJoinableCall: (conversationId: string) => boolean;
  onJoinCall: (conversationEntity: Conversation) => void;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  expandedFolders: ko.ObservableArray<string>;
}

ko.components.register('grouped-conversations', {
  template: `
    <!-- ko foreach: {data: folders, as: 'folder', noChildContext: true} -->
      <div class="conversation-folder" data-uie-name="conversation-folder" data-bind="attr: {'data-uie-value': folder.name}">
        <div class="conversation-folder__head" data-uie-name="conversation-folder-head" data-bind="click: () => toggle(folder.id), css: {'conversation-folder__head--open': isExpanded(folder.id)}">
          <disclose-icon></disclose-icon><span data-bind="text: folder.name"></span>
        </div>
        <div data-bind="visible: isExpanded(folder.id)">
          <!-- ko foreach: {data: folder.conversations, as: 'conversation', noChildContext: true} -->
            <conversation-list-cell
              data-bind="link_to: getConversationUrl(conversation.id), event: {'contextmenu': (_, event) => listViewModel.onContextMenu(conversation, event)}"
              data-uie-name="item-conversation"
              params="click: (_, event) => listViewModel.onContextMenu(conversation, event), conversation: conversation, showJoinButton: hasJoinableCall(conversation.id), is_selected: isSelectedConversation, onJoinCall: onJoinCall">
            </conversation-list-cell>
          <!-- /ko -->
        </div>
      </div>
    <!-- /ko -->
  `,
  viewModel: function({
    conversationRepository,
    listViewModel,
    hasJoinableCall,
    onJoinCall,
    isSelectedConversation,
    expandedFolders = ko.observableArray([]),
  }: GroupedConversationsParams): void {
    const {conversationLabelRepository} = conversationRepository;
    this.listViewModel = listViewModel;
    this.hasJoinableCall = hasJoinableCall;
    this.onJoinCall = onJoinCall;
    this.isSelectedConversation = isSelectedConversation;
    this.getConversationUrl = generateConversationUrl;

    this.folders = ko.pureComputed<ConversationLabel[]>(() => {
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

      const custom = conversationLabelRepository.getLabels();
      folders.push(...custom);

      return folders;
    });
    this.isExpanded = (folderId: string): boolean => expandedFolders().includes(folderId);
    this.toggle = (folderId: string): void => {
      if (this.isExpanded(folderId)) {
        expandedFolders.remove(folderId);
      } else {
        expandedFolders.push(folderId);
      }
    };
  },
});
