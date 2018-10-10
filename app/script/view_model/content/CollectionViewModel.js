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

'use strict';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

// Parent: z.viewModel.ContentViewModel
z.viewModel.content.CollectionViewModel = class CollectionViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
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
    this.conversation_repository = repositories.conversation;
    this.logger = new z.util.Logger('z.viewModel.CollectionViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = ko.observable();

    this.audio = ko.observableArray().extend({rateLimit: 1});
    this.files = ko.observableArray().extend({rateLimit: 1});
    this.images = ko.observableArray().extend({rateLimit: 1});
    this.links = ko.observableArray().extend({rateLimit: 1});

    this.searchInput = ko.observable('');
  }

  addedToView() {
    amplify.subscribe(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.subscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    $(document).on('keydown.collection', keyboardEvent => {
      if (z.util.KeyboardUtil.isEscapeKey(keyboardEvent)) {
        amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversationEntity());
      }
    });
  }

  searchInConversation(query) {
    return this.conversation_repository.searchInConversation(this.conversationEntity(), query);
  }

  onInputChange(input) {
    this.searchInput(input || '');
  }

  itemAdded(messageEntity) {
    const isCurrentConversation = this.conversationEntity().id === messageEntity.conversation_id;
    if (isCurrentConversation) {
      this._populateItems([messageEntity]);
    }
  }

  itemRemoved(messageId, conversationId) {
    const isCurrentConversation = this.conversationEntity().id === conversationId;
    if (isCurrentConversation) {
      const _removeItem = messageEntity => messageEntity.id === messageId;
      [this.audio, this.files, this.images, this.links].forEach(array => array.remove(_removeItem));
    }
  }

  messageRemoved(messageEntity) {
    this.itemRemoved(messageEntity.id, messageEntity.conversation_id);
  }

  removedFromView() {
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageRemoved);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.ADDED, this.itemAdded);
    amplify.unsubscribe(z.event.WebApp.CONVERSATION.MESSAGE.REMOVED, this.itemRemoved);
    $(document).off('keydown.collection');
    this.conversationEntity(null);
    this.searchInput('');
    [this.images, this.files, this.links, this.audio].forEach(array => array.removeAll());
  }

  setConversation(conversationEntity = this.conversation_repository.active_conversation()) {
    if (conversationEntity) {
      this.conversationEntity(conversationEntity);

      this.conversation_repository
        .get_events_for_category(conversationEntity, z.message.MessageCategory.LINK_PREVIEW)
        .then(messageEntities => this._populateItems(messageEntities));
    }
  }

  _populateItems(messageEntities) {
    messageEntities.forEach(messageEntity => {
      if (!messageEntity.is_expired()) {
        // TODO: create binary map helper
        const isImage = messageEntity.category & z.message.MessageCategory.IMAGE;
        const isGif = messageEntity.category & z.message.MessageCategory.GIF;
        if (isImage && !isGif) {
          return this.images.push(messageEntity);
        }

        const isFile = messageEntity.category & z.message.MessageCategory.FILE;
        if (isFile) {
          const isAudio = messageEntity.get_first_asset().is_audio();
          return isAudio ? this.audio.push(messageEntity) : this.files.push(messageEntity);
        }

        const isLinkPreview = messageEntity.category & z.message.MessageCategory.LINK_PREVIEW;
        if (isLinkPreview) {
          this.links.push(messageEntity);
        }
      }
    });
  }

  clickOnMessage(messageEntity) {
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversationEntity(), {exposeMessage: messageEntity});
  }

  clickOnBackButton() {
    amplify.publish(z.event.WebApp.CONVERSATION.SHOW, this.conversationEntity());
  }

  clickOnSection(category, items) {
    this.collectionDetails.setConversation(this.conversationEntity(), category, [].concat(items));
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.COLLECTION_DETAILS);
  }

  clickOnImage(messageEntity) {
    amplify.publish(z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, messageEntity, this.images(), 'collection');
  }
};
