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
import moment from 'moment';

import 'jquery-mousewheel';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {isArrowKey, isMetaKey, isPasteAction} from 'Util/KeyboardUtil';
import {noop} from 'Util/util';
import {LLDM} from 'Util/moment';

import {viewportObserver} from '../../ui/viewportObserver';

/**
 * Focus input field when user starts typing if no other input field or textarea is selected.
 */
ko.bindingHandlers.focus_on_keydown = {
  init(element, valueAccessor, allBindings, data, context) {
    return ko.applyBindingsToNode(
      window,
      {
        event: {
          keydown(_data, jquery_event) {
            if ($('.detail-view').hasClass('modal-show')) {
              return false;
            }

            const keyboard_event = jquery_event.originalEvent || jquery_event;
            // check for activeElement needed, cause in IE11 i could be undefined under some circumstances
            const active_element_is_input =
              document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
            const is_arrow_key = isArrowKey(keyboard_event);

            if (!active_element_is_input && !is_arrow_key) {
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
    const toggleShowTimeStamp = force => {
      const times = document.querySelectorAll('.time');
      times.forEach(time => time.classList.toggle('show-timestamp', force));
    };

    element.addEventListener('mouseenter', () => toggleShowTimeStamp(true));
    element.addEventListener('mouseleave', () => toggleShowTimeStamp(false));
  },
};

ko.bindingHandlers.infinite_scroll = {
  init(scrollingElement, params) {
    const {onHitTop, onHitBottom, onInit} = params();
    onInit(scrollingElement);

    const onScroll = ({target: element}) => {
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

    const onMouseWheel = ({currentTarget: element}) => {
      const isScrollable = element.scrollHeight > element.clientHeight;
      if (isScrollable) {
        // if the element is scrollable, the scroll event will take the relay
        return true;
      }
      const isScrollingUp = event.deltaY > 0;
      if (isScrollingUp) {
        return onHitTop();
      }
      return onHitBottom();
    };

    scrollingElement.addEventListener('scroll', onScroll);
    $(scrollingElement).on('mousewheel', onMouseWheel);

    ko.utils.domNodeDisposal.addDisposeCallback(scrollingElement, () => {
      scrollingElement.removeEventListener('scroll', onScroll);
      $(scrollingElement).off('mousewheel', onMouseWheel);
    });
  },
};

/**
 * Start loading image once they are in the viewport.
 */
ko.bindingHandlers.background_image = {
  init(element, valueAccessor) {
    const assetLoader = valueAccessor();

    if (!assetLoader) {
      return;
    }

    const imageElement = $(element).find('img');
    let objectUrl;

    const loadImage = () => {
      assetLoader
        .load()
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

/**
 * Generate message timestamp.
 */
ko.bindingHandlers.relative_timestamp = (function() {
  // timestamp that should be updated
  const timestamps = [];

  const calculate_timestamp = function(date) {
    const current_time = moment().local();
    const today = current_time.format('YYMMDD');
    const yesterday = current_time.subtract(1, 'days').format('YYMMDD');
    const current_day = date.local().format('YYMMDD');

    if (moment().diff(date, 'minutes') < 2) {
      return t('conversationJustNow');
    }

    if (moment().diff(date, 'minutes') < 60) {
      return date.fromNow();
    }

    if (current_day === today) {
      return date.local().format('LT');
    }

    if (current_day === yesterday) {
      return `${t('conversationYesterday')} ${date.local().format('LT')}`;
    }

    if (moment().diff(date, 'days') < 7) {
      return date.local().format('dddd LT');
    }

    return date.local().format(`${LLDM}, LT`);
  };

  const calculate_timestamp_day = function(date) {
    const now = moment().local();
    const today = now.format('YYMMDD');
    const yesterday = now.subtract(1, 'days').format('YYMMDD');
    const current_day = date.local().format('YYMMDD');

    if (moment().diff(date, 'minutes') < 2) {
      return t('conversationJustNow');
    }

    if (moment().diff(date, 'minutes') < 60) {
      return date.fromNow();
    }

    if (current_day === today) {
      return `${t('conversationToday')} ${date.local().format('LT')}`;
    }

    if (current_day === yesterday) {
      return `${t('conversationYesterday')} ${date.local().format('LT')}`;
    }

    if (moment().diff(date, 'days') < 7) {
      return date.local().format('dddd LT');
    }

    return date.local().format(`dddd, ${LLDM}, LT`);
  };

  // should be fine to update every minute
  window.setInterval(() => timestamps.map(timestamp_func => timestamp_func()), TIME_IN_MILLIS.MINUTE);

  const calculate = function(element, timestamp, is_day) {
    timestamp = window.parseInt(timestamp);
    const date = moment.unix(timestamp / TIME_IN_MILLIS.SECOND);

    if (is_day) {
      return $(element).text(calculate_timestamp_day(date));
    }

    return $(element).text(calculate_timestamp(date));
  };

  return {
    init(element, valueAccessor, allBindings) {
      const timestamp_func = function() {
        calculate(element, valueAccessor(), allBindings.get('relative_timestamp_day'));
      };

      timestamp_func();
      timestamps.push(timestamp_func);

      ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
        const timestamp_index = timestamps.indexOf(timestamp_func);
        timestamps.splice(timestamp_index, 1);
      });
    },
  };
})();
