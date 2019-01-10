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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.FullSearch = class FullSearch {
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
    this.input.subscribe(
      _.debounce(searchQuery => {
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
      }, 100)
    );

    // binding?
    $('.collection-list').on('scroll', event => {
      const showAdditionalMessages = $(event.currentTarget).isScrolledBottom() && this.messageEntities.length;
      if (showAdditionalMessages) {
        const additionalMessageEntities = this.messageEntities.splice(0, FullSearch.CONFIG.MAX_VISIBLE_MESSAGES);
        z.util.koArrayPushAll(this.visibleMessageEntities, additionalMessageEntities);
      }
    });
  }

  htmlFormatResult(messageEntity) {
    const text = z.util.SanitizationUtil.escapeString(messageEntity.get_first_asset().text);
    const input = z.util.SanitizationUtil.escapeString(this.input());

    messageEntity.matchesCount = 0;

    const replaceRegex = z.search.FullTextSearch.getSearchRegex(input);
    const replaceFunction = match => {
      messageEntity.matchesCount += 1;
      return `<mark class='full-search-marked' data-uie-name='full-search-item-mark'>${match}</mark>`;
    };

    let transformedText = text.replace(replaceRegex, replaceFunction);

    const markOffset = transformedText.indexOf('<mark') - 1;
    let sliceOffset = markOffset;

    for (const index of _.range(markOffset).reverse()) {
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

  clickOnDismiss() {
    this.input('');
  }

  dispose() {
    $('.collection-list').off('scroll');
  }
};

ko.components.register('full-search', {
  template: `
    <header class="full-search-header">
      <span class="full-search-header-icon icon-search"></span>
      <div class="full-search-header-input">
        <input type="text" data-bind="hasFocus: true, l10n_placeholder: z.string.fullsearchPlaceholder, textInput: input" data-uie-name="full-search-header-input"/>
        <span class="button-icon icon-dismiss" data-bind="click: clickOnDismiss, visible: input()" data-uie-name="full-search-dismiss"></span>
      </div>
    </header>
    <!-- ko if: showNoResultsText() -->
      <div class="full-search-no-result" data-bind="l10n_text: z.string.fullsearchNoResults" data-uie-name="full-search-no-results"></div>
    <!-- /ko -->
    <div class="full-search-list" data-bind="foreach: {data: visibleMessageEntities}" data-uie-name="full-search-list">
      <div class="full-search-item" data-bind="click: $parent.clickOnMessage" data-uie-name="full-search-item">
        <div class="full-search-item-avatar">
          <participant-avatar params="participant: user, size: z.components.ParticipantAvatar.SIZE.X_SMALL"></participant-avatar>
        </div>
        <div class="full-search-item-content">
          <div class="full-search-item-content-text ellipsis" data-bind="html: $parent.htmlFormatResult($data)" data-uie-name="full-search-item-text"></div>
          <div class="full-search-item-content-info">
            <span class="font-weight-bold" data-bind="text: user().first_name()" data-uie-name="full-search-item-sender"></span>
            <span data-bind="text: moment($data.timestamp()).format('MMMM D, YYYY')" data-uie-name="full-search-item-timestamp"></span>
          </div>
        </div>
        <div class="badge" data-bind="text: matchesCount, visible: matchesCount > 1" data-uie-name="full-search-item-badge"></div>
      </div>
    </div>
  `,
  viewModel: z.components.FullSearch,
});
