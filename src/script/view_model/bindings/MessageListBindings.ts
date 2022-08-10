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

import ko from 'knockout';
import 'jquery-mousewheel';

ko.bindingHandlers.infinite_scroll = {
  init(scrollingElement: HTMLElement, params: () => {onHitBottom: () => void; onHitTop: () => void}) {
    const {onHitTop, onHitBottom} = params();

    const onScroll = ({target: element}: Event & {target: HTMLElement}) => {
      // On some HiDPI screens scrollTop returns a floating point number instead of an integer
      // https://github.com/jquery/api.jquery.com/issues/608
      const scrollPosition = Math.ceil(element.scrollTop);
      const scrollEnd = element.offsetHeight + scrollPosition;
      const hitTop = scrollPosition <= 0;
      const hitBottom = scrollEnd >= element.scrollHeight;

      if (hitTop) {
        onHitTop();
      } else if (hitBottom) {
        onHitBottom();
      }
    };

    const onMouseWheel = ({currentTarget, deltaY}: WheelEvent) => {
      const element = currentTarget as HTMLElement;
      const isScrollable = element.scrollHeight > element.clientHeight;
      if (isScrollable) {
        // if the element is scrollable, the scroll event will take the relay
        return true;
      }
      const isScrollingUp = deltaY > 0;
      if (isScrollingUp) {
        return onHitTop();
      }
      return onHitBottom();
    };

    scrollingElement.addEventListener('scroll', onScroll);
    scrollingElement.addEventListener('wheel', onMouseWheel);

    ko.utils.domNodeDisposal.addDisposeCallback(scrollingElement, () => {
      scrollingElement.removeEventListener('scroll', onScroll);
      scrollingElement.removeEventListener('wheel', onMouseWheel);
    });
  },
};
