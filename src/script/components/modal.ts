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

import {noop, createRandomUuid, preventFocusOutside} from 'Util/util';

interface ModalParams {
  ariaDescribedBy?: string;
  ariaLabelBy?: string;
  isShown: ko.Observable<boolean>;
  large?: boolean;
  onBgClick?: () => void;
  onClosed?: () => void;
  showLoading: ko.Observable<boolean>;
}

ko.components.register('modal-dialog', {
  template: `
    <div class="modal" data-bind="style: {display: displayNone() ? 'none': 'flex', zIndex: 10000001}, attr: displayNone() ? {} : {id: id, 'aria-labelledby': ariaLabelBy, 'aria-describedby': ariaDescribedBy}" tabIndex="-1" aria-modal="true" role="dialog" aria-modal="true">
      <!-- ko if: showLoading() -->
        <loading-icon class="modal__loading"></loading-icon>
      <!-- /ko -->
      <!-- ko ifnot: showLoading() -->
        <div class="modal__content" data-bind="css: {'modal__content--large': large, 'modal__content--visible':  hasVisibleClass() && !showLoading()}, fadingscrollbar">
          <!-- ko template: { nodes: $componentTemplateNodes, data: $parent } --><!-- /ko -->
        </div>
      <!-- /ko -->
    </div>
    <div class="modal__overlay" data-bind="click: () => onBgClick(), css: {'modal__overlay--visible': hasVisibleClass()}, style: {display: displayNone() ? 'none': 'flex'}"></div>
    `,
  viewModel: function ({
    isShown,
    large,
    ariaLabelBy,
    ariaDescribedBy,
    onBgClick = noop,
    onClosed = noop,
    showLoading = ko.observable(false),
  }: ModalParams): void {
    this.large = large;
    this.id = createRandomUuid();
    this.ariaLabelBy = ariaLabelBy;
    this.ariaDescribedBy = ariaDescribedBy;
    this.onBgClick = () => ko.unwrap(onBgClick)();
    this.displayNone = ko.observable(!ko.unwrap(isShown));
    this.hasVisibleClass = ko.computed(() => isShown() && !this.displayNone()).extend({rateLimit: 20});
    this.showLoading = showLoading;
    let timeoutId = 0;

    const maintainFocus = (): void => {
      if (!this.displayNone()) {
        document.addEventListener('keydown', onKeyDown);
        window.setTimeout(() => {
          document.getElementById(this.id).focus();
        });
      }
    };

    // Prevents focus jumping out of the modal content.
    const onKeyDown = (event: KeyboardEvent): void => {
      preventFocusOutside(event, this.id);
    };

    const isDisplayNoneSubscription = this.displayNone.subscribe(() => {
      maintainFocus();
    });

    const isShownSubscription = isShown.subscribe(visible => {
      if (visible) {
        return this.displayNone(false);
      }
      timeoutId = window.setTimeout(() => {
        document.removeEventListener('keydown', onKeyDown);
        this.displayNone(true);
        onClosed();
      }, 150);
    });

    this.dispose = () => {
      isDisplayNoneSubscription.dispose();
      isShownSubscription.dispose();
      this.hasVisibleClass.dispose();
      window.clearTimeout(timeoutId);
    };
  },
});
