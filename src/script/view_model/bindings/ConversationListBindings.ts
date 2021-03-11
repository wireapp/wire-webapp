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

import {amplify} from 'amplify';
import {throttle} from 'underscore';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';

import {isScrollable, isScrolledBottom, isScrolledTop} from 'Util/scroll-helpers';

import type {Conversation} from '../../entity/Conversation';

// show scroll borders
ko.bindingHandlers.bordered_list = (function () {
  const calculateBorders = throttle((element: HTMLElement) => {
    if (element) {
      window.requestAnimationFrame(() => {
        const list_column = $(element).parent();
        if (element.offsetHeight <= 0 || !isScrollable(element)) {
          list_column.removeClass('left-list-center-border-bottom conversations-center-border-top');
          return;
        }

        list_column.toggleClass('left-list-center-border-top', !isScrolledTop(element));
        list_column.toggleClass('left-list-center-border-bottom', !isScrolledBottom(element));
      });
    }
  }, 100);

  return {
    init(element: HTMLElement) {
      element.addEventListener('scroll', () => calculateBorders(element));
      $('.left').on('click', () => calculateBorders(element));
      $(window).on('resize', () => calculateBorders(element));
      amplify.subscribe(WebAppEvents.LIFECYCLE.LOADED, () => calculateBorders(element));
    },

    update(element: HTMLElement, valueAccessor: ko.PureComputed<string> | ko.ObservableArray<Conversation>) {
      ko.unwrap(valueAccessor());
      calculateBorders($(element) as any);
    },
  };
})();
