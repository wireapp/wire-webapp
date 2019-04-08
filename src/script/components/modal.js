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

ko.components.register('modal', {
  template: `
    <div class="modal__overlay" data-bind="click: onBgClick, css: {'modal__overlay--visible': hasVisibleClass()}, style: {display: displayNone() ? 'none': 'flex'}" >
      <div class="modal__content" data-bind="click: () => false, clickBubble: false, css: {'modal__content--large': large}, fadingscrollbar" >
        <!-- ko template: { nodes: $componentTemplateNodes, data: $parent } --><!-- /ko -->
      </div>
    </div>
    `,
  viewModel: function({isShown, large, onBgClick = () => {}, onClosed = () => {}}) {
    this.large = large;
    this.onBgClick = onBgClick;
    this.displayNone = ko.observable(!ko.unwrap(isShown));
    this.hasVisibleClass = ko.computed(() => isShown() && !this.displayNone()).extend({rateLimit: 20});

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
      window.clearTimeout(timeoutId);
    };
  },
});
