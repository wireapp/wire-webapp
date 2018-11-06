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
window.z.components = z.components || {};

z.components.MessageQuote = class MessageQuote {
  constructor({conversation, conversationRepository, locationRepository, quote}) {
    this.updateCanShowMore = this.updateCanShowMore.bind(this);
    this.toggleShowMore = this.toggleShowMore.bind(this);

    this.locationRepository = locationRepository;

    this.canShowMore = ko.observable(false);
    this.showFullText = ko.observable(false);

    this.quotedMessage = ko.observable();
    this.error = quote().error;

    this.quotedMessageIsBeforeToday = ko.pureComputed(() => {
      if (!this.quotedMessage()) {
        return false;
      }
      const quoteDate = moment(this.quotedMessage().timestamp());
      const today = moment().startOf('day');
      return quoteDate.isBefore(today);
    });

    if (!this.error) {
      conversationRepository.get_message_in_conversation_by_id(conversation(), quote().messageId).then(message => {
        this.quotedMessage(message);
      });
    }
  }

  updateCanShowMore(elements) {
    const textQuote = elements.find(element => element.classList && element.classList.contains('message-quote__text'));
    if (textQuote) {
      this.canShowMore(textQuote.scrollWidth > textQuote.clientWidth);
    }
  }

  toggleShowMore() {
    this.showFullText(!this.showFullText());
  }
};

ko.components.register('message-quote', {
  template: `
  <!-- ko if: quotedMessage() || error -->
    <div class="message-quote" data-bind="template: {afterRender: updateCanShowMore}" data-uie-name="quote-item">
      <!-- ko if: error -->
        <div class="message-quote__error" data-bind="l10n_text: z.string.replyQuoteError" data-uie-name="label-error-quote"></div>
      <!-- /ko -->
      <!-- ko ifnot: error -->
        <div class="message-quote__sender" data-bind="text: quotedMessage().headerSenderName()" data-uie-name="label-name-quote"></div>
        <!-- ko foreach: {data: quotedMessage().assets, as: 'asset'} -->
          <!-- ko if: asset.is_image() -->
              <div class="message-quote__image" data-bind="background_image: asset.resource, click: (data, event) => $parents[2].show_detail($parent.quotedMessage(), event)" data-uie-name="media-picture-quote">
                <img data-bind="attr: {src: asset.dummy_url}"/>
              </div>
          <!-- /ko -->

          <!-- ko if: asset.is_text() -->
            <div class="message-quote__text" data-bind="html: asset.render(), css: {'message-quote__text--full': $parent.showFullText()}" dir="auto" data-uie-name="media-text-quote"></div>
            <!-- ko if: $parent.canShowMore -->
              <div class="message-quote__text__show-more" data-bind="click: $parent.toggleShowMore" data-uie-name="do-show-more-quote">
                <span data-bind="l10n_text: $parent.showFullText() ? z.string.replyQuoteShowLess : z.string.replyQuoteShowMore"></span>
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
            <location-asset params="asset: asset, locationRepository: $parent.locationRepository" data-uie-name="media-location-quote"></location-asset>
          <!-- /ko -->
        <!-- /ko -->
        <div class="message-quote__timestamp" 
          data-bind="l10n_text: {
              id: quotedMessageIsBeforeToday() ? z.string.replyQuoteTimeStampDate : z.string.replyQuoteTimeStampTime, 
              substitute: moment(quotedMessage().timestamp()).format(quotedMessageIsBeforeToday() ? 'DD.MM.YYYY' : 'HH:mm')
            },
            click: () => $parents[1]._focusMessage(quotedMessage().id)"></div>
      <!-- /ko -->
    </div>
  <!-- /ko -->
  `,
  viewModel: z.components.MessageQuote,
});
