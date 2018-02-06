/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

z.components.UserListInput = class UserListInput {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);

    this.input = params.input;
    this.onEnter = params.enter;
    this.placeholderText = params.placeholder;
    this.selectedUsers = params.selected;

    this.element = component_info.element;
    this.innerElement = $(this.element).find('.search-inner');
    this.inputElement = $(this.element).find('.search-input');

    if (typeof this.selectedUsers === 'function') {
      this.selectedSubscription = this.selectedUsers.subscribe(() => {
        this.input('');
        this.inputElement.focus();
        window.setTimeout(() => this.innerElement.scrollTop(this.innerElement[0].scrollHeight));
      });
    }

    this.placeholder = ko.pureComputed(() => {
      const hasEmptyInput = this.input() === '';
      const noUsersSelected = !this.selectedUsers || this.selectedUsers().length === 0;

      if (hasEmptyInput && noUsersSelected) {
        return z.l10n.text(this.placeholderText);
      }

      return '';
    });
  }

  onKeyDown(data, keyboardEvent) {
    if (typeof this.selectedUsers === 'function') {
      if (z.util.KeyboardUtil.isRemovalAction(keyboardEvent) && !this.input().length) {
        this.selectedUsers.pop();
      }
    }
    return true;
  }

  dispose() {
    if (this.selectedSubscription) {
      this.selectedSubscription.dispose();
    }
  }
};

ko.components.register('user-input', {
  template: `
    <div class="search-outer">
      <div class="search-inner-wrap">
        <div class="search-inner"">
          <div class="search-icon icon-search"></div>
          <!-- ko foreach: selectedUsers -->
            <span data-bind="text: first_name()"></span>
          <!-- /ko -->
          <input type="text" style="display:none" /> <!-- prevent chrome from autocomplete -->
          <input autocomplete="off" maxlength="128" required spellcheck="false" class="search-input" type="text" data-bind="textInput: input, hasFocus: true, attr: {placeholder: placeholder}, css: {'search-input-show-placeholder': placeholder}, event: {keydown: onKeyDown}, enter: onEnter" data-uie-name="enter-users">
        </div>
      </div>
    </div>
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.UserListInput(params, componentInfo);
    },
  },
});
