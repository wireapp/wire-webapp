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

import type {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import type {Conversation} from 'src/script/entity/Conversation';
import type {ConversationListViewModel} from 'src/script/view_model/list/ConversationListViewModel';
import {
  ConversationLabel,
  createLabel,
  createLabelFavorites,
  createLabelGroups,
  createLabelPeople,
} from '../../conversation/ConversationLabelRepository';
import {generateConversationUrl} from '../../router/routeGenerator';

import './groupedConversationHeader';

interface GroupedConversationsParams {
  conversationRepository: ConversationRepository;
  expandedFolders: ko.ObservableArray<string>;
  hasJoinableCall: (conversationId: string) => boolean;
  isSelectedConversation: (conversationEntity: Conversation) => boolean;
  isVisibleFunc: (top: number, bottom: number) => boolean;
  listViewModel: ConversationListViewModel;
  onJoinCall: (conversationEntity: Conversation) => void;
}

ko.components.register('grouped-conversations', {
  template: `
    <!-- ko foreach: {data: folders, as: 'folder', noChildContext: true} -->
      <div class="conversation-folder" data-uie-name="conversation-folder" data-bind="attr: {'data-uie-value': folder.name}">
      <grouped-conversation-header data-bind="click: () => toggle(folder.id)" params="conversationLabel: folder, isOpen: isExpanded(folder.id)"></grouped-conversation-header>
        <div data-bind="visible: isExpanded(folder.id)">
          <!-- ko foreach: {data: folder.conversations, as: 'conversation', noChildContext: true} -->
            <conversation-list-cell
              data-bind="link_to: getConversationUrl(conversation.id), event: {'contextmenu': (_, event) => listViewModel.onContextMenu(conversation, event)}"
              data-uie-name="item-conversation"
              params="click: (_, event) => listViewModel.onContextMenu(conversation, event), conversation: conversation, showJoinButton: hasJoinableCall(conversation.id), is_selected: isSelectedConversation, onJoinCall: onJoinCall,offsetTop: getOffsetTop(folder, conversation), index: $index, isVisibleFunc: isVisibleFunc">
            </conversation-list-cell>
          <!-- /ko -->
        </div>
      </div>
    <!-- /ko -->
  `,
  viewModel: function ({
    conversationRepository,
    listViewModel,
    hasJoinableCall,
    onJoinCall,
    isSelectedConversation,
    expandedFolders = ko.observableArray([]),
    isVisibleFunc = () => false,
  }: GroupedConversationsParams): void {
    const {conversationLabelRepository} = conversationRepository;
    this.listViewModel = listViewModel;
    this.hasJoinableCall = hasJoinableCall;
    this.onJoinCall = onJoinCall;
    this.isSelectedConversation = isSelectedConversation;
    this.getConversationUrl = generateConversationUrl;
    this.isVisibleFunc = isVisibleFunc;
    this.countUnread = (conversations: ko.Observable<Conversation[]>) =>
      conversations().reduce((sum, conversation) => (conversation.hasUnread() ? sum + 1 : sum), 0);

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

      const custom = conversationLabelRepository
        .getLabels()
        .map(label => createLabel(label.name, conversationLabelRepository.getLabelConversations(label), label.id))
        .filter(({conversations}) => !!conversations().length);
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

    /*
     *  We need to calculate the offset from the top for the isVisibleFunc as we can't rely
     *  on the index of the conversation alone. We need to account for the folder headers and
     *  the height of the <conversation-list-cell>s of the previous open folders.
     */
    this.getOffsetTop = (folder: ConversationLabel, conversation: Conversation) => {
      const folderHeaderHeight = 53;
      const firstFolderHeaderHeight = 33;
      const cellHeight = 56;

      const folders = this.folders() as ConversationLabel[];
      const folderIndex = folders.indexOf(folder);
      const totalHeaderHeight = folderHeaderHeight * folderIndex + firstFolderHeaderHeight;
      const previousExpandedFolders = folders.slice(0, folderIndex).filter(({id}) => this.isExpanded(id));
      const previousCellsHeight = previousExpandedFolders.reduce(
        (height, {conversations}) => height + conversations.length * cellHeight,
        0,
      );
      const currentCellsHeight = folder.conversations.indexOf(conversation) * cellHeight;
      return totalHeaderHeight + previousCellsHeight + currentCellsHeight;
    };
  },
});
