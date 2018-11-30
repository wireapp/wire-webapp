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

z.components.InputElement = class InputElement {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);
    this.value = params.value;

    this.change = (data, event) => {
      const new_name = z.util.StringUtil.removeLineBreaks(event.target.value.trim());
      const old_name = this.value().trim();
      event.target.value = old_name;
      this.editing(false);

      if (new_name !== old_name && typeof params.change === 'function') {
        params.change(new_name);
      }
    };

    this.edit = () => this.editing(true);

    this.editing = ko.observable(false);
    this.editing_subscription = this.editing.subscribe(value => {
      if (value) {
        $(component_info.element)
          .find('textarea')
          .one('keydown', event => {
            if (event.keyCode === z.util.KEYCODE.ESC) {
              this.editing(false);
            }
          });
      } else {
        $(component_info.element)
          .find('textarea')
          .off('keydown', 'esc', this.abort);
      }
    });

    this.placeholder = params.placeholder;
  }

  dispose() {
    this.editing_subscription.dispose();
  }
};

// Knockout registration of the input element component.
ko.components.register('input-element', {
  template: `
    <span data-bind="visible: !editing(), text: value(), click: edit" data-uie-name="status-name"></span>
    <textarea data-bind="visible: editing, value: value(), enter: change, event: {blur: change}, hasFocus: editing, resize, l10n_placeholder: placeholder" maxlength="64" data-uie-name="enter-name"></textarea>
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.InputElement(params, component_info);
    },
  },
});
