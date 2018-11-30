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

// show scroll borders
ko.bindingHandlers.bordered_list = (function() {
  const calculate_borders = _.throttle($element => {
    if ($element) {
      window.requestAnimationFrame(() => {
        const list_column = $($element).parent();
        if ($element.height() <= 0 || !$element.isScrollable()) {
          return list_column.removeClass('left-list-center-border-bottom conversations-center-border-top');
        }

        list_column.toggleClass('left-list-center-border-top', !$element.isScrolledTop());
        list_column.toggleClass('left-list-center-border-bottom', !$element.isScrolledBottom());
      });
    }
  }, 100);

  return {
    init(element) {
      const $element = $(element);
      $element.on('scroll', () => calculate_borders($element));
      $('.left').on('click', () => calculate_borders($element));
      $(window).on('resize', () => calculate_borders($element));
      amplify.subscribe(z.event.WebApp.LIFECYCLE.LOADED, () => calculate_borders($element));
    },

    update(element, valueAccessor) {
      ko.unwrap(valueAccessor());
      calculate_borders($(element));
    },
  };
})();
