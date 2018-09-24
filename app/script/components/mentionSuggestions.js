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

z.components.MentionSuggestions = class MentionSuggestions {
  constructor(params) {
    this.onInput = this.onInput.bind(this);
    this.onSuggestionClick = this.onSuggestionClick.bind(this);

    this.isVisible = ko.observable(false);
    this.onSelectionValidated = params.onSelectionValidated || z.util.noop;
    this.onEnd = params.onEnd || z.util.noop;
    this.suggestions = params.suggestions;
    this.targetInputSelector = params.targetInputSelector;
    this.targetInput = undefined;

    this.position = ko.observable({});

    this.selectedSuggestionIndex = ko.observable(0);
    this.selectedSuggestionIndex.subscribe(this.updateScrollPosition);
    this.selectedSuggestion = ko.pureComputed(() => this.suggestions()[this.selectedSuggestionIndex()]);

    this.suggestions.subscribe(suggestions => {
      const shouldBeVisible = suggestions.length > 0;
      if (shouldBeVisible && !this.isVisible()) {
        this.initList();
        this.updatePosition();
      } else if (!shouldBeVisible && this.isVisible()) {
        this.teardownList();
      } else if (this.isVisible()) {
        this.updateSelectedIndexBoundaries(suggestions);
        this.updatePosition();
      }
      this.isVisible(shouldBeVisible);
      this.updateScrollPosition(this.selectedSuggestionIndex());
    });

    this.shouldUpdateScrollbar = ko.pureComputed(() => this.suggestions()).extend({notify: 'always', rateLimit: 100});
    this.shouldUpdateScrollbar.subscribe(() => {
      z.util.afterRender(() => {
        const item = document.querySelector('.mention-suggestion-list__item');
        const wrapper = document.querySelector('.conversation-input-bar-mention-suggestion');
        if (item && wrapper) {
          wrapper.style.width = `${item.offsetWidth}px`;
        }
      });
    });
  }

  onInput(keyboardEvent) {
    const actions = {
      [z.util.KeyboardUtil.KEY.ARROW_UP]: this.moveSelection.bind(this, 1),
      [z.util.KeyboardUtil.KEY.ARROW_DOWN]: this.moveSelection.bind(this, -1),
      [z.util.KeyboardUtil.KEY.ENTER]: this.validateSelection.bind(this),
      [z.util.KeyboardUtil.KEY.ESC]: this.onEnd,
      [z.util.KeyboardUtil.KEY.TAB]: this.validateSelection.bind(this),
    };

    const action = actions[keyboardEvent.key];
    if (action) {
      action();
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
    }
  }

  moveSelection(delta) {
    const currentIndex = this.selectedSuggestionIndex();
    const newIndex = z.util.NumberUtil.clamp(currentIndex + delta, 0, this.suggestions().length - 1);
    this.selectedSuggestionIndex(newIndex);
  }

  onSuggestionClick(data, event) {
    event.preventDefault();
    $(this.targetInput).focus();
    this.onSelectionValidated(data, this.targetInput);
  }

  validateSelection() {
    this.onSelectionValidated(this.selectedSuggestion(), this.targetInput);
  }

  updateScrollPosition(selectedNumber) {
    const suggestionList = document.querySelector('.mention-suggestion-list');
    if (!suggestionList) {
      return;
    }
    const listItems = suggestionList.querySelectorAll('.mention-suggestion-list__item');
    const selectedItem = listItems[listItems.length - 1 - selectedNumber];
    if (!selectedItem) {
      return;
    }
    const listRect = suggestionList.getBoundingClientRect();
    const itemRect = selectedItem.getBoundingClientRect();
    const topDiff = listRect.top - itemRect.top;
    if (topDiff > 0) {
      return (suggestionList.scrollTop -= topDiff + 4);
    }
    const bottomDiff = itemRect.bottom - listRect.bottom;
    if (bottomDiff > 0) {
      return (suggestionList.scrollTop += bottomDiff + 4);
    }
  }

  initList() {
    this.targetInput = this.initTargetInput();
    this.selectedSuggestionIndex(0);
  }

  updatePosition() {
    const inputBoundingRect = this.targetInput.getBoundingClientRect();
    const bottom = window.innerHeight - inputBoundingRect.top + 24;
    const left = inputBoundingRect.left;

    this.position({bottom: `${bottom}px`, left: `${left}px`});
  }

  updateSelectedIndexBoundaries(suggestions) {
    const currentIndex = this.selectedSuggestionIndex();
    this.selectedSuggestionIndex(z.util.NumberUtil.clamp(currentIndex, 0, suggestions.length - 1));
  }

  teardownList() {
    this.targetInput.removeEventListener('keydown', this.onInput, true);
  }

  initTargetInput() {
    const input = this.targetInput || document.querySelector(this.targetInputSelector);
    input.addEventListener('keydown', this.onInput, true);
    this.targetInput = input;
    return input;
  }
};

ko.components.register('mention-suggestions', {
  template: `
  <!-- ko if: isVisible() -->
    <div class="conversation-input-bar-mention-suggestion" data-uie-name="list-mention-suggestions" data-bind="style: position()">
      <div class="mention-suggestion-list" data-bind="foreach: {data: suggestions().slice().reverse(), as: 'suggestion'}, antiscroll: shouldUpdateScrollbar">
        <div class="mention-suggestion-list__item" data-bind="click: $parent.onSuggestionClick, css: {'mention-suggestion-list__item--highlighted': suggestion === $parent.selectedSuggestion()}, attr: {'data-uie-value': suggestion.id, 'data-uie-selected': suggestion === $parent.selectedSuggestion()}" data-uie-name="item-mention-suggestion">
          <participant-avatar params="participant: suggestion, size: z.components.ParticipantAvatar.SIZE.XXX_SMALL"></participant-avatar>
          <div class="mention-suggestion-list__item__name" data-bind="text: suggestion.name()" data-uie-name="status-name"></div>
          <div class="mention-suggestion-list__item__username"data-bind="text: suggestion.username()" data-uie-name="status-username"></div>
          <!-- ko if: suggestion.isGuest() -->
            <guest-icon class="mention-suggestion-list__item__guest-badge" data-uie-name="status-guest"></guest-icon>
          <!-- /ko -->
        </div>
      </div>
    </div>
  <!-- /ko -->`,

  viewModel: z.components.MentionSuggestions,
});
