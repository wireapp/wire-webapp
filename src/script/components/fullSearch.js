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

import {debounce, escape} from 'underscore';

import {isScrolledBottom} from 'Util/scroll-helpers';
import {koArrayPushAll} from 'Util/util';
import {formatDateShort} from 'Util/TimeUtil';

import {ParticipantAvatar} from 'Components/participantAvatar';
import {getSearchRegex} from '../search/FullTextSearch';

class FullSearch {
  static get CONFIG() {
    return {
      MAX_OFFSET_INDEX: 30,
      MAX_TEXT_LENGTH: 60,
      MAX_VISIBLE_MESSAGES: 30,
      PRE_MARKED_OFFSET: 20,
    };
  }

  constructor(params) {
    this.searchProvider = params.search_provider;
    this.ParticipantAvatar = ParticipantAvatar;

    this.onInputChange = query => {
      if (typeof params.change === 'function') {
        params.change(query);
      }
    };

    this.clickOnMessage = messageEntity => {
      if (typeof params.click === 'function') {
        params.click(messageEntity);
      }
    };

    this.messageEntities = [];
    this.visibleMessageEntities = ko.observableArray();

    this.showNoResultsText = ko.observable(false);

    this.input = ko.observable();
    this.inputSubscription = this.input.subscribe(
      debounce(searchQuery => {
        searchQuery = searchQuery.trim();

        this.onInputChange(searchQuery);

        const isQueryToShort = searchQuery.length < 2;
        if (isQueryToShort) {
          this.messageEntities = [];
          this.visibleMessageEntities([]);
          return this.showNoResultsText(false);
        }

        this.searchProvider(searchQuery).then(({messageEntities, query}) => {
          const isMatchingQuery = query === this.input().trim();
          if (isMatchingQuery) {
            this.showNoResultsText(messageEntities.length === 0);
            this.messageEntities = messageEntities;
            this.visibleMessageEntities(this.messageEntities.splice(0, FullSearch.CONFIG.MAX_VISIBLE_MESSAGES));
          }
        });
      }, 100),
    );

    // binding?
    $('.collection-list').on('scroll', event => {
      const showAdditionalMessages = isScrolledBottom(event.currentTarget) && this.messageEntities.length;
      if (showAdditionalMessages) {
        const additionalMessageEntities = this.messageEntities.splice(0, FullSearch.CONFIG.MAX_VISIBLE_MESSAGES);
        koArrayPushAll(this.visibleMessageEntities, additionalMessageEntities);
      }
    });
  }

  htmlFormatResult(messageEntity) {
    const text = escape(messageEntity.get_first_asset().text);
    const input = escape(this.input());

    messageEntity.matchesCount = 0;

    const replaceRegex = getSearchRegex(input);
    const replaceFunction = match => {
      messageEntity.matchesCount += 1;
      return `<mark class='full-search-marked' data-uie-name='full-search-item-mark'>${match}</mark>`;
    };

    let transformedText = text.replace(replaceRegex, replaceFunction);

    const markOffset = transformedText.indexOf('<mark') - 1;
    let sliceOffset = markOffset;

    for (const index of [...Array(Math.max(markOffset, 0)).keys()].reverse()) {
      if (index < markOffset - FullSearch.CONFIG.PRE_MARKED_OFFSET) {
        break;
      }

      const char = transformedText[index];
      const isWhitespace = char === ' ';
      if (isWhitespace) {
        sliceOffset = index + 1;
      }
    }

    const textTooLong = text.length > FullSearch.CONFIG.MAX_TEXT_LENGTH;
    const offsetTooBig = markOffset > FullSearch.CONFIG.MAX_OFFSET_INDEX;
    if (textTooLong && offsetTooBig) {
      transformedText = `…${transformedText.slice(sliceOffset)}`;
    }

    return transformedText;
  }

  resultTimestamp(messageEntity) {
    return formatDateShort(messageEntity.timestamp());
  }

  clickOnDismiss() {
    this.input('');
  }

  dispose() {
    this.inputSubscription.dispose();
    $('.collection-list').off('scroll');
  }
}

ko.components.register('full-search', {
  template: `
    <header class="full-search-header">
      <span class="full-search-header-icon icon-search"></span>
      <div class="full-search-header-input">
        <input type="text" data-bind="hasFocus: true, attr: {placeholder: t('fullsearchPlaceholder')}, textInput: input" data-uie-name="full-search-header-input"/>
        <span class="button-icon icon-dismiss" data-bind="click: clickOnDismiss, visible: input()" data-uie-name="full-search-dismiss"></span>
      </div>
    </header>
    <!-- ko if: showNoResultsText() -->
      <div class="full-search-no-result" data-bind="text: t('fullsearchNoResults')" data-uie-name="full-search-no-results"></div>
    <!-- /ko -->
    <div class="full-search-list" data-bind="foreach: {data: visibleMessageEntities, as: 'messageEntity', noChildContext: true}" data-uie-name="full-search-list">
      <div class="full-search-item" data-bind="click: () => clickOnMessage(messageEntity)" data-uie-name="full-search-item">
        <div class="full-search-item-avatar">
          <participant-avatar params="participant: messageEntity.user, size: ParticipantAvatar.SIZE.X_SMALL"></participant-avatar>
        </div>
        <div class="full-search-item-content">
          <div class="full-search-item-content-text ellipsis" data-bind="html: htmlFormatResult(messageEntity)" data-uie-name="full-search-item-text"></div>
          <div class="full-search-item-content-info">
            <span class="font-weight-bold" data-bind="text: messageEntity.user().first_name()" data-uie-name="full-search-item-sender"></span>
            <span data-bind="text: resultTimestamp(messageEntity)" data-uie-name="full-search-item-timestamp"></span>
          </div>
        </div>
        <div class="badge" data-bind="text: messageEntity.matchesCount, visible: messageEntity.matchesCount > 1" data-uie-name="full-search-item-badge"></div>
      </div>
    </div>
  `,
  viewModel: FullSearch,
});
