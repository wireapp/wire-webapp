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

z.viewModel.content.MentionSuggestionViewModel = class MentionSuggestionViewModel {
  constructor() {
    this.suggestionDiv = $(
      '<div class="conversation-input-bar-mention-suggestion" data-uie-name="list-mention-suggestions">mentions!</div>'
    );
  }

  show(input) {
    if (!input) {
      return;
    }

    this.suggestionDiv.appendTo('body').show();
    const position = z.util.popup.getCursorPixelPosition(input);
    const top = position.top - this.suggestionDiv.height() - 8;
    const left = position.left - 8;

    this.suggestionDiv.css('left', left);
    this.suggestionDiv.css('top', top);
  }

  hide() {
    this.suggestionDiv.remove();
  }

  selectPrevious() {}
  selectNext() {}
  insertSelected() {}
};
