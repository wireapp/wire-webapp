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
    this.isVisible = ko.observable(false);
    this.onSelectionValidated = params.onSelectionValidated || (() => {});
    this.suggestions = params.suggestions;
    this.targetInputSelector = params.targetInput;
    this.targetInput = undefined;

    this.positions = ko.observable({});

    this.selectedSuggestionIndex = ko.observable(0);
    this.selectedSuggestion = ko.pureComputed(() => {
      const index = this.selectedSuggestionIndex();
      const suggestions = this.suggestions();
      return suggestions[index];
    });

    this.suggestions.subscribe(suggestions => {
      const shouldBeVisible = suggestions.length > 0;
      if (shouldBeVisible && !this.isVisible()) {
        this.initList();
      } else if (!shouldBeVisible && this.isVisible()) {
        this.teardownList();
      }
      this.isVisible(shouldBeVisible);
    });

    this.onInput = this.onInput.bind(this);
  }

  onInput(keyboardEvent) {
    const actions = {
      [z.util.KeyboardUtil.KEY.ARROW_UP]: this.moveSelection.bind(this, 1),
      [z.util.KeyboardUtil.KEY.ARROW_DOWN]: this.moveSelection.bind(this, -1),
      [z.util.KeyboardUtil.KEY.ENTER]: this.validateSelection.bind(this),
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
    const newIndex = Math.max(Math.min(currentIndex + delta, this.suggestions().length - 1), 0);
    this.selectedSuggestionIndex(newIndex);
  }

  validateSelection() {
    this.onSelectionValidated(this.selectedSuggestion());
  }

  initList() {
    this.targetInput = this.initTargetInput();

    this.selectedSuggestionIndex(0);

    const position = z.util.popup.getCursorPixelPosition(this.targetInput);
    const bottom = window.innerHeight - position.top + 8;
    const left = position.left - 8;

    this.positions({bottom: `${bottom}px`, left: `${left}px`});
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
    <div class="conversation-input-bar-mention-suggestion" data-uie-name="list-mention-suggestions" data-bind="style: positions()">
      <ul class="mention-suggestion-list" data-bind="foreach: {data: suggestions, as: 'suggestion'}">
        <li data-bind="style: {color: suggestion === $parent.selectedSuggestion() ? 'green' : ''}">
          <span data-bind="text: suggestion.username()"></span>
        </li>
      </ul>
    </div>
  <!-- /ko -->`,

  viewModel: z.components.MentionSuggestions,
});
