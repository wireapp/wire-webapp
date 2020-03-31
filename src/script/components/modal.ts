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

interface ModalParams {
  isShown: ko.Observable<boolean>;
  large?: boolean;
  onBgClick?: () => void;
  onClosed?: () => void;
  showLoading: ko.Observable<boolean>;
}

ko.components.register('modal', {
  template: `
    <div class="modal__overlay" data-bind="click: () => onBgClick(), css: {'modal__overlay--visible': hasVisibleClass()}, style: {display: displayNone() ? 'none': 'flex'}" >
      <!-- ko if: showLoading() -->
        <loading-icon class="modal__loading"></loading-icon>
      <!-- /ko -->
      <!-- ko ifnot: showLoading() -->
        <div class="modal__content" data-bind="click: () => true, clickBubble: false, css: {'modal__content--large': large, 'modal__content--visible':  hasVisibleClass() && !showLoading()}, fadingscrollbar" >
          <!-- ko template: { nodes: $componentTemplateNodes, data: $parent } --><!-- /ko -->
        </div>
      <!-- /ko -->
    </div>
    `,
  viewModel: function ({
    isShown,
    large,
    onBgClick = noop,
    onClosed = noop,
    showLoading = ko.observable(false),
  }: ModalParams): void {
    this.large = large;
    this.onBgClick = () => ko.unwrap(onBgClick)();
    this.displayNone = ko.observable(!ko.unwrap(isShown));
    this.hasVisibleClass = ko.computed(() => isShown() && !this.displayNone()).extend({rateLimit: 20});
    this.showLoading = showLoading;
    let timeoutId = 0;
    const isShownSubscription = isShown.subscribe(visible => {
      if (visible) {
        return this.displayNone(false);
      }
      timeoutId = window.setTimeout(() => {
        this.displayNone(true);
        onClosed();
      }, 150);
    });

    this.dispose = () => {
      isShownSubscription.dispose();
      this.hasVisibleClass.dispose();
      window.clearTimeout(timeoutId);
    };
  },
});
