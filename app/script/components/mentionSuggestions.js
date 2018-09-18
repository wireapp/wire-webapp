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
    this.suggestions = params.suggestions;
    this.targetInputSelector = params.targetInput;
    this.targetInput = undefined;
    this.isVisible = ko.observable(false);

    this.positions = ko.observable({});

    this.suggestions.subscribe(suggestions => {
      const shouldReposition = !this.isVisible() && suggestions.length > 0;
      this.isVisible(suggestions.length > 0);
      return shouldReposition ? this.reposition() : undefined;
    });
  }

  reposition() {
    this.targetInput = this.targetInput || document.querySelector(this.targetInputSelector);

    const position = z.util.popup.getCursorPixelPosition(this.targetInput);
    const bottom = window.innerHeight - position.top + 8;
    const left = position.left - 8;

    this.positions({bottom: `${bottom}px`, left: `${left}px`});
  }
};

ko.components.register('mention-suggestions', {
  template: `
  <!-- ko if: isVisible() -->
    <div class="conversation-input-bar-mention-suggestion" data-uie-name="list-mention-suggestions" data-bind="style: positions()">
      <ul data-bind="foreach: {data: suggestions, as: 'suggestion'}">
        <li><span data-bind="text: suggestion.username()"></span></li>
      </ul>
    </div>
  <!-- /ko -->`,

  viewModel: z.components.MentionSuggestions,
});
