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
 * Use it on the drop area.
 */
ko.bindingHandlers.drop_file = {
  init(element, valueAccessor, allBindings, data, context) {
    const onDragLeave = (_data, event) => event.currentTarget.classList.remove('drag-hover');

    const onDragOver = (_data, event) => {
      event.preventDefault();
      event.originalEvent.dataTransfer.dropEffect = 'copy';
      event.currentTarget.classList.add('drag-hover');
    };

    const onDrop = (_data, event) => {
      event.preventDefault();
      event.currentTarget.classList.remove('drag-hover');

      const {dataTransfer, originalEvent} = event;
      const eventDataTransfer = dataTransfer || (originalEvent && originalEvent.dataTransfer) || {};
      const files = eventDataTransfer.files || [];

      if (files.length > 0) {
        valueAccessor()(files);
      }
    };

    ko.applyBindingsToNode(
      element,
      {
        event: {
          dragleave: onDragLeave,
          dragover: onDragOver,
          drop: onDrop,
        },
      },
      context
    );
  },
};

/**
 * Capture pasted files.
 */
ko.bindingHandlers.paste_file = {
  init(element, valueAccessor, allBindings, data, context) {
    const onPaste = (_data, event) => {
      const clipboardData = event.originalEvent.clipboardData;
      const items = [].slice.call(clipboardData.items || clipboardData.files);

      const files = items
        .filter(item => item.kind === 'file')
        .map(item => new Blob([item.getAsFile()], {type: item.type}))
        .filter(item => item && item.size !== 4); // Pasted files result in 4 byte blob (OSX)

      if (files.length > 0) {
        valueAccessor()(files);
        return false;
      }
      return true;
    };

    ko.applyBindingsToNode(
      window,
      {
        event: {
          paste: onPaste,
        },
      },
      context
    );
  },
};

/**
 * Blocks the default behavior when dropping a file on the element.
 * @note If a child element is listening to drag events, than this will be triggered after
 */
ko.bindingHandlers.ignore_drop_file = {
  init(element, valueAccessor, allBindings, data, context) {
    ko.applyBindingsToNode(
      element,
      {
        event: {
          dragover: (_data, event) => event.preventDefault(),
          drop: (_data, event) => event.preventDefault(),
        },
      },
      context
    );
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
ko.bindingHandlers.resize = {
  init(element, valueAccessor, allBindings, data, context) {
    const params = ko.unwrap(valueAccessor()) || {};

    let lastHeight = element.scrollHeight;

    const resizeTextarea = (textareaElement => {
      textareaElement.style.height = 0;
      const newStyleHeight = `${textareaElement.scrollHeight}px`;
      textareaElement.style.height = newStyleHeight;

      const currentHeight = textareaElement.clientHeight;

      if (lastHeight !== currentHeight) {
        lastHeight = currentHeight;
        const maxHeight = window.parseInt(getComputedStyle(textareaElement).maxHeight, 10);

        const isMaximumHeight = currentHeight >= maxHeight;
        const newStyleOverflowY = isMaximumHeight ? 'scroll' : 'hidden';
        textareaElement.style.overflowY = newStyleOverflowY;
      }
    }).bind(null, element);
    const throttledResizeTextarea = _.throttle(resizeTextarea, 100, {leading: !params.delayedResize});

    resizeTextarea();
    return ko.applyBindingsToNode(
      element,
      {
        event: {
          focus: throttledResizeTextarea,
          input: throttledResizeTextarea,
        },
      },
      context
    );
  },
};

ko.bindingHandlers.heightSync = {
  init(element, valueAccessor, allBindings, data, context) {
    const params = ko.unwrap(valueAccessor()) || {};

    const resizeCallback = params.callback;
    const targetElement = document.querySelector(params.target);
    const triggerValue = params.trigger;

    const resizeTarget = () => {
      const sourceHeight = element.scrollHeight;
      const targetHeight = targetElement.offsetHeight;
      if (sourceHeight !== targetHeight) {
        targetElement.style.overflowY = 'hidden';
        targetElement.style.height = `${element.scrollHeight}px`;
        z.util.afterRender(() => (targetElement.style.overflowY = ''));
        if (typeof resizeCallback === 'function') {
          resizeCallback(sourceHeight, targetHeight);
        }
      }
    };

    // initial resize
    resizeTarget();
    const valueSubscription = triggerValue.subscribe(() => window.requestAnimationFrame(resizeTarget));
    ko.utils.domNodeDisposal.addDisposeCallback(element, () => valueSubscription.dispose());
  },
};

/**
 * Syncs scrolling to another element.
 */
ko.bindingHandlers.scrollSync = {
  init(element, valueAccessor) {
    const selector = valueAccessor();
    const anchorElement = document.querySelector(selector);
    if (anchorElement) {
      anchorElement.addEventListener('scroll', () => {
        element.scrollTop = anchorElement.scrollTop;
      });
    }
  },
};

/**
 * Register on enter key pressed.
 */
ko.bindingHandlers.enter = {
  init(element, valueAccessor, allBindings, data, context) {
    const wrapper = function(_data, jquery_event) {
      const keyboard_event = jquery_event.originalEvent || jquery_event;

      if (z.util.KeyboardUtil.isEnterKey(keyboard_event) && !keyboard_event.shiftKey && !keyboard_event.altKey) {
        const callback = valueAccessor();
        if (typeof callback === 'function') {
          callback.call(this, data, keyboard_event);
          return false;
        }
      }
      return true;
    };

    return ko.applyBindingsToNode(
      element,
      {
        event: {
          keypress: wrapper,
        },
      },
      context
    );
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
        window.setTimeout(() => {
          $(event.target).val(null);
        }, z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);
      }
    };

    return ko.applyBindingsToNode(
      element,
      {
        event: {
          change: wrapper,
          focus(_data, event) {
            return $(event.target).blur();
          },
        },
      },
      context
    );
  },
};

/**
 * Wait for image to be loaded before applying as background image.
 */
ko.bindingHandlers.loadImage = {
  init(element, valueAccessor) {
    const image_src = z.util.stripUrlWrapper(ko.unwrap(valueAccessor()));
    const image = new Image();
    image.onload = () => (element.style.backgroundImage = `url(${image_src})`);
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
  const subscription = this.subscribe(
    new_value => {
      subscription.dispose();
      handler(new_value);
    },
    owner,
    event_name
  );
};

/**
 * Subscribe to changes and receive the new and the old value
 * https://github.com/knockout/knockout/issues/914#issuecomment-66697321
 * @param {function} handler - Handler
 * @returns {ko.subscription} knockout subscription
 */

ko.subscribable.fn.subscribeChanged = function(handler) {
  let savedValue = this.peek();
  return this.subscribe(latestValue => {
    const oldValue = savedValue;
    savedValue = latestValue;
    handler(latestValue, oldValue);
  });
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
      debug: false,
      notHorizontal: true,
    });

    const parent_element = $(element).parent();
    const antiscroll = parent_element.data('antiscroll');

    if (antiscroll) {
      const trigger_value = valueAccessor();
      if (ko.isObservable(trigger_value)) {
        trigger_subscription = trigger_value.subscribe(() => {
          antiscroll.rebuild();
        });
      }

      const resize_event = `resize.${Date.now()}`;
      $(window).on(
        resize_event,
        _.throttle(() => {
          antiscroll.rebuild();
        }, 100)
      );

      ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
        antiscroll.destroy();
        $(window).off(resize_event);
        if (trigger_subscription) {
          trigger_subscription.dispose();
        }
      });
    }
  },
};

ko.bindingHandlers.simplebar = {
  init(element, valueAccessor) {
    const {trigger = valueAccessor(), onInit} = valueAccessor();
    const simpleBar = new window.SimpleBar(element, {autoHide: false});
    if (ko.isObservable(trigger)) {
      const triggerSubscription = trigger.subscribe(() => simpleBar.recalculate());
      ko.utils.domNodeDisposal.addDisposeCallback(element, () => triggerSubscription.dispose());
    }
    if (onInit) {
      onInit(simpleBar);
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
  window.setInterval(() => timestamps.map(timestamp_func => timestamp_func()), z.util.TimeUtil.UNITS_IN_MILLIS.MINUTE);

  const calculate = function(element, timestamp) {
    timestamp = window.parseInt(timestamp);
    const date = moment.unix(timestamp / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);

    const now = moment().local();
    const today = now.format('YYMMDD');
    const yesterday = now.subtract(1, 'days').format('YYMMDD');
    const current_day = date.local().format('YYMMDD');

    if (moment().diff(date, 'minutes') < 2) {
      return $(element).text(z.l10n.text(z.string.conversationJustNow));
    }

    if (moment().diff(date, 'minutes') < 60) {
      return $(element).text(date.fromNow());
    }

    if (current_day === today) {
      return $(element).text(date.local().format('HH:mm'));
    }

    if (current_day === yesterday) {
      return $(element).text(`${z.l10n.text(z.string.conversationYesterday)} ${date.local().format('HH:mm')}`);
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

      ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
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
    const {timeout = valueAccessor(), skipClass} = valueAccessor();
    let hide_timeout = undefined;

    element.onmouseenter = function() {
      element.classList.remove('hide-controls');
    };

    element.onmouseleave = function() {
      if (document.hasFocus()) {
        return element.classList.add('hide-controls');
      }
    };

    element.onmousemove = function({target}) {
      if (hide_timeout) {
        window.clearTimeout(hide_timeout);
      }

      element.classList.remove('hide-controls');

      let node = target;
      while (node && node !== element) {
        if (node.classList.contains(skipClass)) {
          return;
        }
        node = node.parentNode;
      }

      hide_timeout = window.setTimeout(() => {
        element.classList.add('hide-controls');
      }, timeout);
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
 * Adds a callback called whenever an element is in viewport and not overlayed by another element.
 */
ko.bindingHandlers.in_viewport = {
  init(element, valueAccessor) {
    const onElementVisible = valueAccessor();
    if (!onElementVisible) {
      return;
    }
    z.ui.ViewportObserver.addElement(element, () => {
      return z.ui.OverlayedObserver.onElementVisible(element, onElementVisible);
    });

    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      z.ui.OverlayedObserver.removeElement(element);
      z.ui.ViewportObserver.removeElement(element);
    });
  },
};

ko.bindingHandlers.tooltip = {
  update(element, valueAccessor) {
    const {text = valueAccessor(), position, disabled} = valueAccessor();
    if (!disabled) {
      const {id = text, substitute} = text;
      element.classList.add('with-tooltip', `with-tooltip--${position === 'bottom' ? 'bottom' : 'top'}`);
      element.setAttribute('data-tooltip', z.l10n.text(id, substitute));
    }
  },
};

/**
 * Suppresses the click event if we are in the macOs wrapper and are dragging the window
 */
ko.bindingHandlers.clickOrDrag = {
  init(element, valueAccessor, allBindings, viewModel, bindingContext) {
    const isMacDesktop = z.util.Environment.electron && z.util.Environment.os.mac;
    const context = bindingContext.$data;
    const callback = valueAccessor().bind(context, context);
    if (!isMacDesktop) {
      return element.addEventListener('click', callback);
    }

    let isMoved = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    element.addEventListener('mousedown', ({screenX, screenY}) => {
      isDragging = true;
      isMoved = false;
      startX = screenX;
      startY = screenY;
    });

    element.addEventListener('mousemove', ({screenX, screenY}) => {
      if (isDragging && !isMoved) {
        const diffX = Math.abs(startX - screenX);
        const diffY = Math.abs(startY - screenY);
        if (diffX > 1 || diffY > 1) {
          isMoved = true;
        }
      }
    });

    element.addEventListener('mouseup', event => {
      if (!isMoved) {
        callback(event);
      }
      isDragging = false;
    });
  },
};
