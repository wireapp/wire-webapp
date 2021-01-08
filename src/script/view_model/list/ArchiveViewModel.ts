/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {ConversationState} from '../../conversation/ConversationState';
import {ListViewModel} from '../ListViewModel';
import type {Conversation} from '../../entity/Conversation';
import type {ConversationRepository} from '../../conversation/ConversationRepository';

export class ArchiveViewModel {
  readonly listViewModel: ListViewModel;
  private readonly conversationRepository: ConversationRepository;
  readonly archivedConversations: ko.ObservableArray<Conversation>;
  readonly shouldUpdateScrollbar: ko.Computed<number>;
  readonly onJoinCall: Function;

  constructor(
    listViewModel: ListViewModel,
    conversationRepository: ConversationRepository,
    onJoinCall: Function,
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.listViewModel = listViewModel;
    this.conversationRepository = conversationRepository;

    this.archivedConversations = this.conversationState.conversations_archived;

    this.shouldUpdateScrollbar = ko
      .computed(() => this.listViewModel.lastUpdate())
      .extend({notify: 'always', rateLimit: 500});

    this.onJoinCall = onJoinCall;
  }

  readonly clickOnConversation = (conversationEntity: Conversation): void => {
    this.conversationRepository.unarchiveConversation(conversationEntity, true, 'opened conversation from archive');
    this.listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, conversationEntity);
  };

  readonly clickOnClose = (): void => {
    this.listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
  };

  readonly updateList = (): void => {
    this.conversationRepository.updateArchivedConversations();
  };
}
