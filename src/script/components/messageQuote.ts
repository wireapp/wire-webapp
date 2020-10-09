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

import ko from 'knockout';
import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';

import {isBeforeToday, formatDateNumeral, formatTimeShort} from 'Util/TimeUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';

import {QuoteEntity} from '../message/QuoteEntity';
import {ConversationError} from '../error/ConversationError';
import type {Conversation} from '../entity/Conversation';
import type {ContentMessage} from '../entity/message/ContentMessage';
import type {User} from '../entity/User';
import type {MessageRepository} from '../conversation/MessageRepository';

interface MessageQuoteParams {
  conversation: ko.Observable<Conversation>;
  focusMessage: (id: string) => void;
  handleClickOnMessage: (message: ContentMessage, event: Event) => boolean;
  messageRepository: MessageRepository;
  quote: ko.Observable<QuoteEntity>;
  selfId: ko.Observable<string>;
  showDetail: (message: ContentMessage, event: UIEvent) => void;
  showUserDetails: (user: User) => void;
}

class MessageQuote {
  canShowMore: ko.Observable<boolean>;
  dispose: () => void;
  error: ko.Observable<any>;
  focusMessage: () => void;
  formatDateNumeral: (date: string | number | Date) => string;
  formatTimeShort: (date: string | number | Date) => string;
  handleClickOnMessage: (message: ContentMessage, event: Event) => boolean;
  includesOnlyEmojis: (text: string) => boolean;
  quotedMessage: ko.Observable<ContentMessage>;
  quotedMessageId: ko.Observable<any>;
  quotedMessageIsBeforeToday: ko.PureComputed<boolean>;
  selfId: ko.Observable<string>;
  showDetail: (message: ContentMessage, event: UIEvent) => void;
  showFullText: ko.Observable<boolean>;
  showUserDetails: (user: User) => void;

  constructor({
    conversation,
    messageRepository,
    focusMessage,
    handleClickOnMessage,
    quote,
    selfId,
    showDetail,
    showUserDetails,
  }: MessageQuoteParams) {
    this.showDetail = showDetail;
    this.handleClickOnMessage = handleClickOnMessage;
    this.showUserDetails = showUserDetails;

    this.focusMessage = () => {
      if (this.quotedMessage()) {
        focusMessage(this.quotedMessage().id);
      }
    };

    this.selfId = selfId;
    this.formatDateNumeral = formatDateNumeral;
    this.formatTimeShort = formatTimeShort;

    this.canShowMore = ko.observable(false);
    this.showFullText = ko.observable(false);

    this.quotedMessage = ko.observable();
    this.quotedMessageId = ko.observable();
    this.error = ko.observable(quote().error);

    this.includesOnlyEmojis = includesOnlyEmojis;

    const quotedMessageSubscription = this.quotedMessage.subscribe(() => this.showFullText(false));

    this.quotedMessageIsBeforeToday = ko.pureComputed(() => {
      if (!this.quotedMessage()) {
        return false;
      }
      return isBeforeToday(this.quotedMessage().timestamp());
    });

    if (!this.error() && quote().messageId) {
      messageRepository
        .getMessageInConversationById(conversation(), quote().messageId, true, true)
        .then(message => {
          this.quotedMessage(message);
          this.quotedMessageId(message.id);
        })
        .catch(error => {
          if (error.type === ConversationError.TYPE.MESSAGE_NOT_FOUND) {
            return this.error(QuoteEntity.ERROR.MESSAGE_NOT_FOUND);
          }
          throw error;
        });
    }

    const handleQuoteDeleted = (messageId: string) => {
      if (this.quotedMessageId() === messageId) {
        this.error(QuoteEntity.ERROR.MESSAGE_NOT_FOUND);
        this.quotedMessage(undefined);
      }
    };

    const handleQuoteUpdated = (originalMessageId: string, messageEntity: ContentMessage) => {
      if (this.quotedMessageId() === originalMessageId) {
        this.quotedMessage(messageEntity);
        this.quotedMessageId(messageEntity.id);
      }
    };

    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleQuoteDeleted);
    amplify.subscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleQuoteUpdated);

    this.dispose = () => {
      quotedMessageSubscription.dispose();
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.REMOVED, handleQuoteDeleted);
      amplify.unsubscribe(WebAppEvents.CONVERSATION.MESSAGE.UPDATED, handleQuoteUpdated);
    };
  }

  updateCanShowMore = (elements: Element[]) => {
    const textQuote = elements.find(element => element.classList && element.classList.contains('message-quote__text'));
    if (textQuote) {
      const preNode = textQuote.querySelector('pre');
      const width = Math.max(textQuote.scrollWidth, preNode ? preNode.scrollWidth : 0);
      const height = Math.max(textQuote.scrollHeight, preNode ? preNode.scrollHeight : 0);
      const isWider = width > textQuote.clientWidth;
      const isHigher = height > textQuote.clientHeight;
      this.canShowMore(isWider || isHigher);
    }
  };

  toggleShowMore = () => {
    this.showFullText(!this.showFullText());
  };
}

ko.components.register('message-quote', {
  template: `
  <!-- ko if: quotedMessage() || error() -->
    <div class="message-quote" data-uie-name="quote-item">
      <!-- ko if: error() -->
        <div class="message-quote__error" data-bind="text: t('replyQuoteError')" data-uie-name="label-error-quote"></div>
      <!-- /ko -->
      <!-- ko ifnot: error() -->
        <div class="message-quote__sender">
          <span data-bind="text: quotedMessage().headerSenderName(), click: () => showUserDetails(quotedMessage().user)" data-uie-name="label-name-quote"></span>
          <!-- ko if: quotedMessage().was_edited() -->
            <edit-icon data-uie-name="message-edited-quote" data-bind="attr: {title: quotedMessage().display_edited_timestamp()}"></edit-icon>
          <!-- /ko -->
        </div>
        <!-- ko foreach: {data: quotedMessage().assets, as: 'asset', afterRender: updateCanShowMore} -->
          <!-- ko if: asset.is_image() -->
              <div class="message-quote__image" data-bind="background_image: asset.resource(), click: (data, event) => $parent.showDetail($parent.quotedMessage(), event)" data-uie-name="media-picture-quote">
                <img data-bind="attr: {src: asset.dummy_url}"/>
              </div>
          <!-- /ko -->

          <!-- ko if: asset.is_text() -->
            <div class="message-quote__text" data-bind="html: asset.render($parent.selfId()),
                                                        event: {click: $parent.handleClickOnMessage},
                                                        css: {'message-quote__text--full': $parent.showFullText(),
                                                              'message-quote__text--large': $parent.includesOnlyEmojis(asset.text)}"
              dir="auto" data-uie-name="media-text-quote"></div>
            <!-- ko if: $parent.canShowMore -->
              <div class="message-quote__text__show-more" data-bind="click: $parent.toggleShowMore" data-uie-name="do-show-more-quote">
                <span data-bind="text: $parent.showFullText() ? t('replyQuoteShowLess') : t('replyQuoteShowMore')"></span>
                <disclose-icon data-bind="css: {'upside-down': $parent.showFullText()}"></disclose-icon>
              </div>
            <!-- /ko -->
          <!-- /ko -->

          <!-- ko if: asset.is_video() -->
            <video-asset class="message-quote__video" params="message: $parent.quotedMessage, isQuote: true" data-uie-name="media-video-quote"></video-asset>
          <!-- /ko -->

          <!-- ko if: asset.is_audio() -->
            <audio-asset class="message-quote__audio" params="message: $parent.quotedMessage" data-uie-name="media-audio-quote"></audio-asset>
          <!-- /ko -->

          <!-- ko if: asset.is_file() -->
            <file-asset class="message-quote__file" params="message: $parent.quotedMessage" data-uie-name="media-file-quote"></file-asset>
          <!-- /ko -->

          <!-- ko if: asset.is_location() -->
            <location-asset params="asset: asset" data-uie-name="media-location-quote"></location-asset>
          <!-- /ko -->
        <!-- /ko -->
        <div class="message-quote__timestamp"
          data-bind="text: quotedMessageIsBeforeToday()
            ? t('replyQuoteTimeStampDate', formatDateNumeral(quotedMessage().timestamp()))
            : t('replyQuoteTimeStampTime', formatTimeShort(quotedMessage().timestamp())),
            click: focusMessage"
          data-uie-name="label-timestamp-quote">
        </div>
      <!-- /ko -->
    </div>
  <!-- /ko -->
  `,
  viewModel: MessageQuote,
});
