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

import {iterateItem} from 'Util/ArrayUtil';
import {KEY} from 'Util/KeyboardUtil';
import {formatLocale} from 'Util/TimeUtil';
import ko from 'knockout';
import {amplify} from 'amplify';

import {WebAppEvents} from '@wireapp/webapp-events';
import {Modal} from '../ui/Modal';
import type {MainViewModel} from './MainViewModel';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import type {AssetRepository} from '../assets/AssetRepository';
import type {ActionsViewModel} from './ActionsViewModel';
import type {Conversation} from '../entity/Conversation';
import type {ContentMessage} from '../entity/message/ContentMessage';
import type {MediumImage} from '../entity/message/MediumImage';
import type {MessageRepository} from '../conversation/MessageRepository';
import {MessageCategory} from '../message/MessageCategory';

export class ImageDetailViewViewModel {
  elementId: 'detail-view';
  actionsViewModel: ActionsViewModel;
  source: string;
  imageModal: Modal;
  imageSrc: ko.Observable<string>;
  imageVisible: ko.Observable<boolean>;
  conversationEntity: ko.Observable<Conversation>;
  items: ko.ObservableArray<ContentMessage>;
  messageEntity: ko.Observable<ContentMessage>;

  constructor(
    mainViewModel: MainViewModel,
    private readonly conversationRepository: ConversationRepository,
    private readonly assetRepository: AssetRepository,
    private readonly messageRepository: MessageRepository,
  ) {
    this.elementId = 'detail-view';

    this.actionsViewModel = mainViewModel.actions;
    this.source = undefined;

    this.imageModal = undefined;
    this.imageSrc = ko.observable();
    this.imageVisible = ko.observable(false);

    this.conversationEntity = ko.observable();
    this.items = ko.observableArray();
    this.messageEntity = ko.observable();
    this.messageEntity.subscribe(messageEntity => {
      if (messageEntity) {
        const conversationId = messageEntity.conversation_id;
        const isExpectedId = this.conversationEntity() ? conversationId === this.conversationEntity().id : false;
        if (!isExpectedId) {
          this.conversationRepository
            .get_conversation_by_id(conversationId)
            .then(conversationEntity => this.conversationEntity(conversationEntity));
        }
      }
    });

    amplify.subscribe(WebAppEvents.CONVERSATION.DETAIL_VIEW.SHOW, this.show);

    ko.applyBindings(this, document.getElementById(this.elementId));
  }

  beforeHideCallback = () => {
    this.imageVisible(false);
  };

  hideCallback = () => {
    $(document).off('keydown.lightbox');
    window.URL.revokeObjectURL(this.imageSrc());

    this.imageSrc(undefined);
    this.items.removeAll();
    this.messageEntity(undefined);
    this.source = undefined;

    amplify.unsubscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageExpired);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.messageAdded);
    amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.messageRemoved);
  };

  show = (messageEntity: ContentMessage, messageEntities: ContentMessage[], source: string) => {
    this.items(messageEntities);
    this.messageEntity(messageEntity);
    this.source = source;

    amplify.subscribe(WebAppEvents.CONVERSATION.EPHEMERAL_MESSAGE_TIMEOUT, this.messageExpired);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.ADDED, this.messageAdded);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, this.messageRemoved);

    if (!this.imageModal) {
      this.imageModal = new Modal('#detail-view', this.hideCallback, this.beforeHideCallback);
    }

    this.imageModal.show();

    this.loadImage();
    $(document).on('keydown.lightbox', keyboardEvent => {
      switch (keyboardEvent.key) {
        case KEY.ESC: {
          this.clickOnClose();
          break;
        }

        case KEY.ARROW_DOWN:
        case KEY.ARROW_RIGHT: {
          this.clickOnShowNext(this, (keyboardEvent as unknown) as MouseEvent);
          break;
        }

        case KEY.ARROW_LEFT:
        case KEY.ARROW_UP: {
          this.clickOnShowPrevious(this, (keyboardEvent as unknown) as MouseEvent);
          break;
        }

        default:
          break;
      }
    });
  };

  messageAdded = (messageEntity: ContentMessage) => {
    const isCurrentConversation = this.conversationEntity().id === messageEntity.conversation_id;
    const isImage = messageEntity.category & MessageCategory.IMAGE && !(messageEntity.category & MessageCategory.GIF);
    if (isCurrentConversation && isImage) {
      this.items.push(messageEntity);
    }
  };

  messageExpired = (messageEntity: ContentMessage) => {
    this.messageRemoved(messageEntity.id, messageEntity.conversation_id);
  };

  messageRemoved = (messageId: string, conversationId: string) => {
    const isCurrentConversation = this.conversationEntity().id === conversationId;
    if (isCurrentConversation) {
      const isVisibleMessage = this.messageEntity().id === messageId;
      if (isVisibleMessage) {
        return this.imageModal.hide();
      }

      this.items.remove(messageEntity => messageEntity.id === messageId);
    }
  };

  formatTimestamp = (timestamp: number) => {
    return formatLocale(timestamp, 'P p');
  };

  private readonly loadImage = () => {
    this.imageVisible(false);
    this.assetRepository.load((this.messageEntity().get_first_asset() as MediumImage).resource()).then(blob => {
      if (blob) {
        this.imageSrc(window.URL.createObjectURL(blob));
        this.imageVisible(true);
      }
    });
  };

  clickOnClose = () => {
    this.imageModal.hide();
  };

  clickOnDownload = () => {
    this.messageEntity().download(this.assetRepository);
  };

  clickOnLike = () => {
    this.messageRepository.toggle_like(this.conversationEntity(), this.messageEntity());
  };

  clickOnReply = () => {
    amplify.publish(WebAppEvents.CONVERSATION.SHOW, this.conversationEntity());
    amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, this.messageEntity());
    this.imageModal.hide();
  };

  clickOnShowNext = (imageDetailViewViewModel: unknown, event: MouseEvent) => {
    event.stopPropagation();
    this.iterateImage(true);
  };

  clickOnShowPrevious = (imageDetailViewViewModel: unknown, event: MouseEvent) => {
    event.stopPropagation();
    this.iterateImage(false);
  };

  private readonly iterateImage = (reverse: boolean) => {
    const messageEntity = iterateItem(this.items(), this.messageEntity(), reverse);

    if (messageEntity) {
      this.messageEntity(messageEntity);
      this.loadImage();
    }
  };
}
