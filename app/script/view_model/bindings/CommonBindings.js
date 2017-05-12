/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
 * Use it on the drop area.
 */
ko.bindingHandlers.drop_file = {
  init(element, valueAccessor, allBindings, data, context) {
    const fileDragOver = function(_data, event) {
      event.preventDefault();
      event.originalEvent.dataTransfer.dropEffect = 'copy';
      event.currentTarget.classList.add('drag-hover');
    };

    const fileDragLeave = function(_data, event) {
      event.currentTarget.classList.remove('drag-hover');
    };

    const fileSelectHandler = function(_data, event) {
      event.preventDefault();
      event.currentTarget.classList.remove('drag-hover');

      let files = [];
      if (event.dataTransfer) {
        files = event.dataTransfer.files;
      } else if (event.originalEvent && event.originalEvent.dataTransfer) {
        files = event.originalEvent.dataTransfer.files;
      }

      if (files.length > 0) {
        valueAccessor().call(this, files);
      }
    };

    ko.applyBindingsToNode(element, {
      event: {
        dragleave: fileDragLeave,
        dragover: fileDragOver,
        drop: fileSelectHandler,
      },
    },
    context);
  },
};

/**
 * Capture pasted files.
 */
ko.bindingHandlers.paste_file = {
  init(element, valueAccessor, allBindings, data, context) {

    const on_paste = function(_data, event) {
      const clipboard_data = event.originalEvent.clipboardData;
      const items = [].slice.call(clipboard_data.items || clipboard_data.files);

      const files = items
        .filter((item) => item.kind === 'file')
        .map((item) => new File([item.getAsFile()], null, {type: item.type}))
        .filter((item) => item && item.size !== 4); // Pasted files result in 4 byte blob (OSX)

      if (files.length > 0) {
        valueAccessor()(files);
        return false;
      }
      return true;
    };

    return ko.applyBindingsToNode(window, {
      event: {
        paste: on_paste,
      },
    },
    context);
  },
};

/**
 * Blocks the default behavior when dropping a file on the element.
 * @note If a child element is listening to drag events, than this will be triggered after
 */
ko.bindingHandlers.ignore_drop_file = {
  init(element, valueAccessor, allBindings, data, context) {
    return ko.applyBindingsToNode(element, {
      event: {
        dragover(_data, event) {
          event.preventDefault();
        },
        drop(_data, event) {
          event.preventDefault();
        },
      },
    },
    context);
  },
};


/**
 * Indicate that the current binding loop should not try to bind this element’s children.
 * @see http://www.knockmeout.net/2012/05/quick-tip-skip-binding.html
 */
ko.bindingHandlers.stopBinding = {
  init() {
    return {controlsDescendantBindings: true};
  },
};

ko.virtualElements.allowedBindings.stopBinding = true;

/**
 * Resize textarea according to the containing text.
 */
ko.bindingHandlers.resize = (function() {
  let last_height = null;
  let resize_observable = null;
  let resize_callback = null;

  const resize_textarea = _.throttle(function(element) {
    element.style.height = 0;
    element.style.height = `${element.scrollHeight}px`;

    const current_height = element.clientHeight;

    // height has changed
    if (last_height !== current_height) {
      if (typeof resize_callback === 'function') {
        resize_callback(current_height, last_height);
      }
      last_height = current_height;
      const max_height = window.parseInt(getComputedStyle(element).maxHeight, 10);

      if (current_height === max_height) {
        return element.style.overflowY = 'scroll';
      }

      element.style.overflowY = 'hidden';
    }
  },
  100);

  return {
    init(element, valueAccessor, allBindings, data, context) {
      last_height = element.scrollHeight;
      resize_observable = ko.unwrap(valueAccessor());
      resize_callback = allBindings.get('resize_callback');

      if (!resize_observable) {
        return ko.applyBindingsToNode(element, {
          event: {
            focus() {
              resize_textarea(element);
            },
            input() {
              resize_textarea(element);
            },
          },
        },
        context);
      }
    },

    update(element, valueAccessor, allBindings) {
      resize_observable = ko.unwrap(valueAccessor());
      resize_textarea(element);
      resize_callback = allBindings.get('resize_callback');
    },
  };
})();

/**
 * Register on enter key pressed.
 */
ko.bindingHandlers.enter = {
  init(element, valueAccessor, allBindings, data, context) {
    const wrapper = function(_data, event) {
      if ((event.keyCode === z.util.KEYCODE.ENTER) && !event.shiftKey && !event.altKey) {
        const callback = valueAccessor();
        if (typeof callback === 'function') {
          callback.call(this, data, event);
          return false;
        }
      }
      return true;
    };

    return ko.applyBindingsToNode(element, {
      event: {
        keypress: wrapper,
      },
    },
    context);
  },
};

/**
 * Binding for <input type="file" data-bind="fileSelect: on_file_select">.
 */
ko.bindingHandlers.file_select = {
  init(element, valueAccessor, allBindings, data, context) {
    const wrapper = function(_data, event) {
      if (event.target.files.length > 0) {
        valueAccessor().call(this, event.target.files);

        // http://stackoverflow.com/a/12102992/4453133
        // wait before clearing to fix autotests
        window.setTimeout(function() {
          $(event.target).val(null);
        }, 1000);
      }
    };

    return ko.applyBindingsToNode(element, {
      event: {
        change: wrapper,
        focus(_data, event) {
          return $(event.target).blur();
        },
      },
    }
    , context);
  },
};

/**
 * Wait for image to be loaded before applying as background image.
 */
ko.bindingHandlers.load_image = {
  init(element, valueAccessor) {
    const image_src = z.util.strip_url_wrapper(ko.unwrap(valueAccessor()));
    const image = new Image();
    image.onload = () => element.style.backgroundImage = `url(${image_src})`;
    image.src = image_src;
  },
};

/**
 * Load image when hovering over element.
 */
ko.bindingHandlers.load_image_on_hover = {
  init(element) {
    const hoverable_item = $(element);
    const static_image = hoverable_item.data('src');
    const animated_gif = hoverable_item.data('hover');

    if (animated_gif) {
      let image = undefined;
      hoverable_item
        .on('mouseover', function() {
          const item = $(this);
          image = new Image();
          image.onload = () => item.css({backgroundImage: `url(${animated_gif})`});
          image.src = animated_gif;
        })
        .on('mouseout', function() {
          image.onload = undefined;
          $(this).css({backgroundImage: `url(${static_image})`});
        });
    }
  },
};

/**
 * This execution trims the underlying value.
 * @returns {ko.computed} Computed
 */
ko.subscribable.fn.trimmed = function() {
  return ko.computed({
    owner: this,
    read() {
      return this().trim();
    },
    write(value) {
      this(value.trim());
      this.valueHasMutated();
    },
  });
};

/**
 * Will only fire once when the value has changed.
 * @param {*} handler - Handler
 * @param {ko.observable} owner - Subscription owner
 * @param {string} event_name - Event name
 * @returns {undefined} No return value
 */
ko.subscribable.fn.subscribe_once = function(handler, owner, event_name) {
  const subscription = this.subscribe(function(new_value) {
    subscription.dispose();
    handler(new_value);
  },
  owner,
  event_name);
};

/**
 * Render antiscroll scrollbar.
 */
ko.bindingHandlers.antiscroll = {
  init(element, valueAccessor) {
    let trigger_subscription;
    $(element).antiscroll({
      autoHide: true,
      autoWrap: true,
    });

    const parent_element = $(element).parent();
    const antiscroll = parent_element.data('antiscroll');

    if (antiscroll) {
      const trigger_value = valueAccessor();
      if (ko.isObservable(trigger_value)) {
        trigger_subscription = trigger_value.subscribe(function() {
          antiscroll.rebuild();
        });
      }

      const resize_event = `resize.${Date.now()}`;
      $(window).on(resize_event, _.throttle(function() {
        antiscroll.rebuild();
      }),
      100);

      ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        antiscroll.destroy();
        $(window).off(resize_event);
        if (trigger_subscription) {
          trigger_subscription.dispose();
        }
      });
    }
  },
};


ko.bindingHandlers.electron_remove = {
  init(element) {
    if (z.util.Environment.electron) {
      $(element).remove();
    }
  },
};


ko.bindingHandlers.visibility = (function() {
  const setVisibility = function(element, valueAccessor) {
    const hidden = ko.unwrap(valueAccessor());
    return $(element).css('visibility', hidden ? 'visible' : 'hidden');
  };
  return {
    init: setVisibility,
    update: setVisibility,
  };
})();


ko.bindingHandlers.relative_timestamp = (function() {
  const timestamps = [];

  // should be fine to fire all 60 sec
  window.setInterval(function() {
    timestamps.map((timestamp_func) => timestamp_func());
  },
  60 * 1000);

  const calculate = function(element, timestamp) {
    timestamp = window.parseInt(timestamp);
    const date = moment.unix(timestamp / 1000);

    const now = moment().local();
    const today = now.format('YYMMDD');
    const yesterday = now.subtract(1, 'days').format('YYMMDD');
    const current_day = date.local().format('YYMMDD');

    if (moment().diff(date, 'minutes') < 2) {
      return $(element).text(z.l10n.text(z.string.conversation_just_now));
    }

    if (moment().diff(date, 'minutes') < 60) {
      return $(element).text(date.fromNow());
    }

    if (current_day === today) {
      return $(element).text(date.local().format('HH:mm'));
    }

    if (current_day === yesterday) {
      return $(element).text(`${z.l10n.text(z.string.conversation_yesterday)} ${date.local().format('HH:mm')}`);
    }

    if (moment().diff(date, 'days') < 7) {
      return $(element).text(date.local().format('dddd HH:mm'));
    }

    return $(element).text(date.local().format('dddd, MMMM D, HH:mm'));
  };

  return {
    init(element, valueAccessor) {
      const timestamp_func = () => calculate(element, valueAccessor());
      timestamp_func();
      timestamps.push(timestamp_func);

      ko.utils.domNodeDisposal.addDisposeCallback(element, function() {
        const timestamp_index = timestamps.indexOf(timestamp_func);
        timestamps.splice(timestamp_index, 1);
      });
    },
  };
})();

/**
 * Add 'hide-controls' when the mouse leave the element or stops moving.
 */
ko.bindingHandlers.hide_controls = {
  init(element, valueAccessor) {
    const timeout = valueAccessor();
    let hide_timeout = undefined;

    element.onmouseenter = function() {
      element.classList.remove('hide-controls');
    };

    element.onmouseleave = function() {
      if (document.hasFocus()) {
        return element.classList.add('hide-controls');
      }
    };

    element.onmousemove = function() {
      if (hide_timeout) {
        window.clearTimeout(hide_timeout);
      }

      element.classList.remove('hide-controls');

      hide_timeout = window.setTimeout(function() {
        element.classList.add('hide-controls');
      },
      timeout);
    };
  },
};

/**
 * Element is added to view.
 */
ko.bindingHandlers.added_to_view = {
  init(element, valueAccessor) {
    const callback = valueAccessor();
    callback();
  },
};

/**
 * Element is removed fomr view
 */
ko.bindingHandlers.removed_from_view = {
  init(element, valueAccessor) {
    const callback = valueAccessor();
    ko.utils.domNodeDisposal.addDisposeCallback(element, () => callback());
  },
};

/**
 * Element is in viewport. return true within the callback to dispose the subscription
 */
ko.bindingHandlers.in_viewport = (function() {
  const listeners = [];

  // listeners can be deleted during iteration
  const notify_listeners = _.throttle((event) => {
    listeners
      .reverse()
      .forEach((listener) => listener(event))
      .reverse();
  },
  300);

  window.addEventListener('scroll', notify_listeners, true);

  return {
    init(element, valueAccessor, allBindingsAccessor) {

      const _in_view = function(dom_element) {
        const box = dom_element.getBoundingClientRect();
        return (box.right >= 0) && (box.bottom >= 0) && (box.left <= document.documentElement.clientWidth) && (box.top <= document.documentElement.clientHeight);
      };

      const _dispose = function() {
      };

      const _check_element = function() {
        let is_child = true;
        if (event) {
          is_child = event.target.contains(element);
        }

        if (is_child && _in_view(element)) {
          if (typeof valueAccessor() === 'function') {
            _dispose();
          }
        }
      };

      listeners.push(_check_element);
      window.setTimeout(_check_element, allBindingsAccessor.get('delay') || 0);

      ko.utils.domNodeDisposal.addDisposeCallback(element, _dispose);
    },
  };
})();
