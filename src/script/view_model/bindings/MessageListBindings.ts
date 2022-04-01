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
import {container} from 'tsyringe';
import 'jquery-mousewheel';

import {
  isArrowKey,
  isPageUpDownKey,
  isMetaKey,
  isTabKey,
  isPasteAction,
  isEnterKey,
  isSpaceKey,
} from 'Util/KeyboardUtil';
import {noop} from 'Util/util';

import {viewportObserver} from '../../ui/viewportObserver';
import {AssetRepository} from '../../assets/AssetRepository';

/**
 * Focus input field when user starts typing if no other input field or textarea is selected.
 */
ko.bindingHandlers.focus_on_keydown = {
  init(element, _valueAccessor, _allBindings, _data, context) {
    return ko.applyBindingsToNode(
      window as any,
      {
        event: {
          keydown(_data: unknown, jquery_event: JQuery.Event<HTMLElement, KeyboardEvent>) {
            if ($('.detail-view').hasClass('modal-show')) {
              return false;
            }
            const keyboard_event = (jquery_event.originalEvent || jquery_event) as KeyboardEvent;
            // check for activeElement needed, because in IE11 it could be undefined under some circumstances
            const active_element_is_input =
              document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            const is_arrow_key = isArrowKey(keyboard_event);
            const is_pageupdown_key = isPageUpDownKey(keyboard_event);
            const is_tab_key = isTabKey(keyboard_event);
            const is_enter_key = isEnterKey(keyboard_event);
            const is_space_key = isSpaceKey(keyboard_event);
            if (is_pageupdown_key) {
              (document.activeElement as HTMLElement).blur();
            } else if (!active_element_is_input && !is_arrow_key && !is_tab_key && !is_enter_key && !is_space_key) {
              if (!isMetaKey(keyboard_event) || isPasteAction(keyboard_event)) {
                element.focus();
              }
            }

            return true;
          },
        },
      },
      context,
    );
  },
};

/**
 * Show timestamp when hovering over the element.
 */
ko.bindingHandlers.showAllTimestamps = {
  init(element) {
    const toggleShowTimeStamp = (force?: boolean) => {
      const times = document.querySelectorAll('.time');
      times.forEach(time => time.classList.toggle('show-timestamp', force));
    };

    element.addEventListener('mouseenter', () => toggleShowTimeStamp(true));
    element.addEventListener('mouseleave', () => toggleShowTimeStamp(false));
  },
};

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

/**
 * Start loading image once they are in the viewport.
 */
ko.bindingHandlers.background_image = {
  init(element, valueAccessor) {
    const assetRepository = container.resolve(AssetRepository);
    const asset = valueAccessor();

    if (!asset) {
      return;
    }

    const imageElement = $(element).find('img');
    let objectUrl: string;

    const loadImage = () => {
      assetRepository
        .load(asset)
        .then(blob => {
          objectUrl = window.URL.createObjectURL(blob);
          imageElement[0].src = objectUrl;
        })
        .catch(noop);
    };

    viewportObserver.onElementInViewport(element, loadImage);

    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      viewportObserver.removeElement(element);
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    });
  },
};
