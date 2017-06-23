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

z.components.UserListInputViewModel = class UserListInputViewModel {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);

    this.input = params.input;
    this.selected = params.selected || ko.observableArray([]);
    this.placeholder = params.placeholder;
    this.on_enter = params.enter;
    this.on_close = params.close;

    this.element = component_info.element;
    this.input_element = $(this.element).find('.search-input');
    this.inner_element = $(this.element).find('.search-inner');

    this.search_icon_visible = ko.pureComputed(() => !this.selected().length && !this.input().length);

    this.selected_subscription = this.selected.subscribe(() => {
      this.input('');
      this.input_element.focus();
      window.setTimeout(() => {
        this.inner_element.scrollTop(this.inner_element[0].scrollHeight);
      });
    });

    this.placeholder = ko.pureComputed(() => {
      if ((this.input() === '') && (this.selected().length === 0)) {
        return z.l10n.text(params.placeholder);
      }

      return '';
    });
  }

  on_key_press(data, event) {
    if ((event.keyCode === z.util.KEYCODE.DELETE) && (this.input() === '')) {
      this.selected.pop();
    }
    return true;
  }

  dispose() {
    this.selected_subscription.dispose();
  }
};

ko.components.register('user-input', {
  template: `
    <div class="search-outer">
      <div class="search-inner-wrap">
        <div class="search-inner">
          <div class="search-icon icon-search" data-bind="visible: search_icon_visible"></div>
          <!-- ko foreach: selected -->
            <span data-bind="text: first_name()"></span>
          <!-- /ko -->
          <input type="text" style="display:none" /> <!-- prevent chrome from autocomplete -->
          <input autocomplete="off" maxlength="128" required spellcheck="false" class="search-input" type="text" data-bind="textInput: input, hasFocus: true, event: {keydown: on_key_press}, enter: on_enter, attr: {placeholder: placeholder}" data-uie-name="enter-users">
          <!-- ko if: on_close -->
            <div class="search-close icon-close icon-button" data-bind="click: on_close, l10n_tooltip: z.string.tooltip_search_close" data-uie-name="do-close"></div>
          <!-- /ko -->
        </div>
      </div>
    </div>
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.UserListInputViewModel(params, component_info);
    },
  },
});
