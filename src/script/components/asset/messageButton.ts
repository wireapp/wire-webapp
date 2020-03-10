/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import ko from 'knockout';

import {noop} from 'Util/util';

interface MessageButtonProps {
  label: string;
  id: string | number;
  onClick?: () => void;
  selectedButtonId?: ko.Observable<string | number>;
  waitingButtonId?: ko.Observable<string | number>;
  errorMessage?: string;
}

ko.components.register('message-button', {
  template: `
    <div>
      <button class="message-button" data-bind="css: {'message-button--selected': isSelected}, click: onClick, attr: {'data-uie-name': label, 'data-uie-selected': isSelected, 'data-uie-waiting': isWaiting}">
        <span data-bind="text: label"></span>
        <div class="message-button__waiting-overlay" data-bind="css: {'message-button__waiting-overlay--visible': isWaiting}">
          <loading-icon></loading-icon>
        </div>
      </button>
      <!--ko if: errorMessage -->
        <div class="message-button__error" data-bind="text: errorMessage"></div>
      <!-- /ko -->
    </div>`,
  viewModel: function({
    label,
    id,
    onClick = noop,
    selectedButtonId = ko.observable(),
    waitingButtonId = ko.observable(),
    errorMessage,
  }: MessageButtonProps) {
    this.label = label;
    this.onClick = onClick;
    this.isSelected = ko.pureComputed(() => selectedButtonId() === id);
    this.isWaiting = ko.pureComputed(() => waitingButtonId() === id);
    this.errorMessage = errorMessage;
  },
});
