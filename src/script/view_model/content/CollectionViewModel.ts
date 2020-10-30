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

import {isEscapeKey} from 'Util/KeyboardUtil';
import {amplify} from 'amplify';
import ko from 'knockout';

import {WebAppEvents} from '@wireapp/webapp-events';
import {MessageCategory} from '../../message/MessageCategory';
import {ContentViewModel} from '../ContentViewModel';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {ContentMessage} from '../../entity/message/ContentMessage';
import {CollectionDetailsViewModel} from './CollectionDetailsViewModel';
import {Conversation} from '../../entity/Conversation';
import {ConversationState} from '../../conversation/ConversationState';
import {container} from 'tsyringe';

export class CollectionViewModel {
  collectionDetails: CollectionDetailsViewModel;
  conversationEntity: ko.Observable<Conversation>;
  audio: ko.ObservableArray<ContentMessage>;
  files: ko.ObservableArray<ContentMessage>;
  images: ko.ObservableArray<ContentMessage>;
  links: ko.ObservableArray<ContentMessage>;
  searchInput: ko.Observable<string>;

  constructor(
    contentViewModel: ContentViewModel,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationState = container.resolve(ConversationState),
  ) {
    this.addedToView = this.addedToView.bind(this);
    this.clickOnMessage = this.clickOnMessage.bind(this);
    this.itemAdded = this.itemAdded.bind(this);
    this.itemRemoved = this.itemRemoved.bind(this);
    this.messageRemoved = this.messageRemoved.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
    this.removedFromView = this.removedFromView.bind(this);
    this.searchInConversation = this.searchInConversation.bind(this);
    this.setConversation = this.setConversation.bind(this);

    this.collectionDetails = contentViewModel.collectionDetails;

    this.conversationEntity = ko.observable();

    this.audio = ko.observableArray().extend({rateLimit: 1});
    this.files = ko.observableArray().extend({rateLimit: 1});
    this.images = ko.observableArray().extend({rateLimit: 1});
    this.links = ko.observableArray().extend({rateLimit: 1});

    this.searchInput = ko.observable('');
  }

  addedToView() {
    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    $(document).on('keydown.collection', keyboardEvent => {
      if (isEscapeKey((keyboardEvent as unknown) as KeyboardEvent)) {
        amplify.publish(WebAppEvents.CONVERSATION.SHOW, this.conversationEntity());
      }
    });
  }

  searchInConversation(query: string) {
    return this.conversationRepository.searchInConversation(this.conversationEntity(), query);
  }

  onInputChange(input: string) {
    this.searchInput(input || '');
  }

  itemAdded(messageEntity: ContentMessage) {
    const isCurrentConversation = this.conversationEntity().id === messageEntity.conversation_id;
    if (isCurrentConversation) {
      this._populateItems([messageEntity]);
    }
  }

  itemRemoved(messageId: string, conversationId: string) {
    const isCurrentConversation = this.conversationEntity().id === conversationId;
    if (isCurrentConversation) {
      const _removeItem = (messageEntity: ContentMessage) => messageEntity.id === messageId;
      [this.audio, this.files, this.images, this.links].forEach(array => array.remove(_removeItem));
    }
  }

  messageRemoved(messageEntity: ContentMessage) {
    this.itemRemoved(messageEntity.id, messageEntity.conversation_id);
  }

  removedFromView() {
    amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    $(document).off('keydown.collection');
    this.conversationEntity(null);
    this.searchInput('');
    [this.images, this.files, this.links, this.audio].forEach(array => array.removeAll());
  }

  setConversation(conversationEntity = this.conversationState.activeConversation()) {
    if (conversationEntity) {
      this.conversationEntity(conversationEntity);

      this.conversationRepository
        .get_events_for_category(conversationEntity, MessageCategory.LINK_PREVIEW)
        .then(messageEntities => this._populateItems(messageEntities as ContentMessage[]));
    }
  }

  private _populateItems(messageEntities: ContentMessage[]) {
    messageEntities.forEach((messageEntity: ContentMessage) => {
      if (!messageEntity.is_expired()) {
        // TODO: create binary map helper
        const isImage = messageEntity.category & MessageCategory.IMAGE;
        const isGif = messageEntity.category & MessageCategory.GIF;
        if (isImage && !isGif) {
          return this.images.push(messageEntity);
        }

        const isFile = messageEntity.category & MessageCategory.FILE;
        if (isFile) {
          const isAudio = messageEntity.get_first_asset().is_audio();
          return isAudio ? this.audio.push(messageEntity) : this.files.push(messageEntity);
        }

        const isLinkPreview = messageEntity.category & MessageCategory.LINK_PREVIEW;
        if (isLinkPreview) {
          this.links.push(messageEntity);
        }
      }
      return undefined;
    });
  }

  clickOnMessage(messageEntity: ContentMessage) {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, this.conversationEntity(), {exposeMessage: messageEntity});
  }

  clickOnBackButton() {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, this.conversationEntity());
  }

  clickOnSection(category: string, items: ContentMessage[]) {
    this.collectionDetails.setConversation(this.conversationEntity(), category, [].concat(items));
    amplify.publish(WebAppEvents.CONTENT.SWITCH, ContentViewModel.STATE.COLLECTION_DETAILS);
  }

  clickOnImage(messageEntity: ContentMessage) {
    amplify.publish(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, messageEntity, this.images(), 'collection');
  }
}
