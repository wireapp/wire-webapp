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

'use strict';

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
            const is_arrow_key = z.util.KeyboardUtil.isArrowKey(keyboard_event);

            if (!active_element_is_input && !is_arrow_key) {
              const is_meta_key_pressed = z.util.KeyboardUtil.isMetaKey(keyboard_event);
              const is_paste_action = z.util.KeyboardUtil.isPasteAction(keyboard_event);

              if (!is_meta_key_pressed || is_paste_action) {
                element.focus();
              }
            }

            return true;
          },
        },
      },
      context
    );
  },
};

/**
 * Show timestamp when hovering over the element.
 */
ko.bindingHandlers.show_all_timestamps = {
  init(element) {
    const $element = $(element);

    $element.on('mousemove mouseout', function(event) {
      const rect = $(this)
        .find('.messages')[0]
        .getBoundingClientRect();
      const show_timestamps = event.clientX > rect.right - 64 && event.clientX < rect.right;
      $('.time').toggleClass('show-timestamp', show_timestamps);
    });
  },
};

/**
 * Start loading image once they are in the viewport.
 */
ko.bindingHandlers.background_image = {
  init(element, valueAccessor, allBindingsAccessor) {
    let object_url;

    const _in_view = function(dom_element) {
      const box = dom_element.getBoundingClientRect();
      return (
        box.right >= 0 &&
        box.bottom >= 0 &&
        box.left <= document.documentElement.clientWidth &&
        box.top <= document.documentElement.clientHeight
      );
    };

    const _on_viewport_change = _.debounce(() => {
      if (_in_view(element) && asset_remote_data()) {
        asset_remote_data()
          .load()
          .then(blob => {
            $(element).removeClass('image-loading');
            object_url = window.URL.createObjectURL(blob);
            image_element[0].src = object_url;
            viewport_subscription.dispose();
          })
          .catch(() => {});
      }
    }, 500);

    const image_element = $(element).find('img');
    const asset_remote_data = valueAccessor();

    const viewport_changed = allBindingsAccessor.get('viewport_changed');
    const viewport_subscription = viewport_changed.subscribe(_on_viewport_change);
    const asset_subscription = asset_remote_data.subscribe(_on_viewport_change);

    _on_viewport_change();

    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      viewport_subscription.dispose();
      asset_subscription.dispose();
      if (object_url) {
        window.URL.revokeObjectURL(object_url);
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
      return z.l10n.text(z.string.conversationJustNow);
    }

    if (moment().diff(date, 'minutes') < 60) {
      return date.fromNow();
    }

    if (current_day === today) {
      return date.local().format('HH:mm');
    }

    if (current_day === yesterday) {
      return `${z.l10n.text(z.string.conversationYesterday)} ${date.local().format('HH:mm')}`;
    }

    if (moment().diff(date, 'days') < 7) {
      return date.local().format('dddd HH:mm');
    }

    return date.local().format('MMMM D, HH:mm');
  };

  const calculate_timestamp_day = function(date) {
    const now = moment().local();
    const today = now.format('YYMMDD');
    const yesterday = now.subtract(1, 'days').format('YYMMDD');
    const current_day = date.local().format('YYMMDD');

    if (moment().diff(date, 'minutes') < 2) {
      return z.l10n.text(z.string.conversationJustNow);
    }

    if (moment().diff(date, 'minutes') < 60) {
      return date.fromNow();
    }

    if (current_day === today) {
      return `${z.l10n.text(z.string.conversationToday)} ${date.local().format('HH:mm')}`;
    }

    if (current_day === yesterday) {
      return `${z.l10n.text(z.string.conversationYesterday)} ${date.local().format('HH:mm')}`;
    }

    if (moment().diff(date, 'days') < 7) {
      return date.local().format('dddd HH:mm');
    }

    return date.local().format('dddd, MMMM D, HH:mm');
  };

  // should be fine to update every minute
  window.setInterval(() => {
    timestamps.map(timestamp_func => timestamp_func());
  }, 60 * 1000);

  const calculate = function(element, timestamp, is_day) {
    timestamp = window.parseInt(timestamp);
    const date = moment.unix(timestamp / 1000);

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
