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

import {Runtime} from '@wireapp/commons';
import $ from 'jquery';
import ko from 'knockout';
import SimpleBar from 'simplebar';
import {debounce, throttle} from 'underscore';

import {isEnterKey} from 'Util/KeyboardUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {stripUrlWrapper} from 'Util/util';

import {overlayedObserver} from '../../ui/overlayedObserver';
import {viewportObserver} from '../../ui/viewportObserver';

type KOEvent<T = Event> = JQuery.Event & {currentTarget: Element; originalEvent: T};

/**
 * Indicate that the current binding loop should not try to bind this element's children.
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
  init(element, valueAccessor, _allBindings, _data, context) {
    const params = ko.unwrap(valueAccessor()) || {};

    let lastHeight = element.scrollHeight;

    const resizeTextarea = ((textareaElement: HTMLTextAreaElement) => {
      textareaElement.style.height = '0';
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
    const throttledResizeTextarea = throttle(resizeTextarea, 100, {leading: !params.delayedResize});

    resizeTextarea();
    return ko.applyBindingsToNode(
      element,
      {
        event: {
          focus: throttledResizeTextarea,
          input: throttledResizeTextarea,
        },
      },
      context,
    );
  },
};

/**
 * Register on enter key pressed.
 */
ko.bindingHandlers.enter = {
  init(element, valueAccessor, _allBindings, data, context) {
    function wrapper(_data: unknown, event: KOEvent<KeyboardEvent>) {
      const keyboardEvent = event.originalEvent || (event as unknown as KeyboardEvent);

      if (isEnterKey(keyboardEvent) && !keyboardEvent.shiftKey && !keyboardEvent.altKey) {
        const callback = valueAccessor();
        if (typeof callback === 'function') {
          callback.call(this, data, keyboardEvent);
          return false;
        }
      }
      return true;
    }

    return ko.applyBindingsToNode(
      element,
      {
        event: {
          keypress: wrapper,
        },
      },
      context,
    );
  },
};

/**
 * Binding for <input type="file" data-bind="fileSelect: on_file_select">.
 */
ko.bindingHandlers.file_select = {
  init(element, valueAccessor, _allBindings, _data, context) {
    function wrapper(_: unknown, event: KOEvent<InputEvent>) {
      if ((event.target as HTMLInputElement).files.length > 0) {
        valueAccessor().call(this, (event.target as HTMLInputElement).files);

        // http://stackoverflow.com/a/12102992/4453133
        // wait before clearing to fix autotests
        window.setTimeout(() => {
          $(event.target).val(null);
        }, TIME_IN_MILLIS.SECOND);
      }
    }

    return ko.applyBindingsToNode(
      element,
      {
        event: {
          change: wrapper,
          focus(_data: unknown, event: KOEvent) {
            return $(event.target).blur();
          },
        },
      },
      context,
    );
  },
};

/**
 * Wait for image to be loaded before applying as background image.
 */
ko.bindingHandlers.loadImage = {
  init(element, valueAccessor) {
    const image_src = stripUrlWrapper(ko.unwrap(valueAccessor()));
    const image = new Image();
    image.onload = () => (element.style.backgroundImage = `url(${image_src})`);
    image.src = image_src;
  },
};

/**
 * Will only fire once when the value has changed.
 */
(ko.subscribable.fn as any).subscribe_once = function (
  handler: (value: unknown) => void,
  owner: ko.Observable,
  eventName: string,
) {
  const subscription = this.subscribe(
    (newValue: unknown) => {
      subscription.dispose();
      handler(newValue);
    },
    owner,
    eventName,
  );
};

/**
 * Subscribe to changes and receive the new and the old value
 * https://github.com/knockout/knockout/issues/914#issuecomment-66697321
 */
(ko.subscribable.fn as any).subscribeChanged = function (handler: (latestValue: unknown, oldValue: unknown) => void) {
  let savedValue = this.peek();
  return this.subscribe((latestValue: unknown) => {
    const oldValue = savedValue;
    savedValue = latestValue;
    handler(latestValue, oldValue);
  });
};

ko.bindingHandlers.fadingscrollbar = {
  init(element) {
    const animationSpeed = 12;
    function parseColor(color: string) {
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      return ctx.getImageData(0, 0, 1, 1).data;
    }

    const initialColor = parseColor(window.getComputedStyle(element).getPropertyValue('--scrollbar-color'));
    const currentColor = initialColor.slice();
    let state = 'idle';
    let animating = false;

    function setAnimationState(newState: string) {
      state = newState;
      if (!animating) {
        animate();
      }
    }

    function animate() {
      switch (state) {
        case 'fadein':
          fadeStep(animationSpeed);
          break;
        case 'fadeout':
          fadeStep(-animationSpeed);
          break;

        default:
          animating = false;
          return;
      }
      animating = true;
      window.requestAnimationFrame(animate);
    }

    const fadeStep = (delta: number) => {
      const initialAlpha = initialColor[3];
      const currentAlpha = currentColor[3];
      const hasAppeared = delta > 0 && currentAlpha >= initialAlpha;
      const hasDisappeared = delta < 0 && currentAlpha <= 0;
      if (hasAppeared || hasDisappeared) {
        return setAnimationState('idle');
      }
      currentColor[3] += delta;
      const [r, g, b, a] = currentColor;
      element.style.setProperty('--scrollbar-color', ` rgba(${r}, ${g}, ${b}, ${a / 255})`);
    };
    const fadeIn = () => setAnimationState('fadein');
    const fadeOut = () => setAnimationState('fadeout');
    const debouncedFadeOut = debounce(fadeOut, 1000);

    element.addEventListener('mouseenter', fadeIn);
    element.addEventListener('mouseleave', fadeOut);
    element.addEventListener('mousemove', fadeIn);
    element.addEventListener('mousemove', debouncedFadeOut);
    element.addEventListener('scroll', fadeIn);
    element.addEventListener('scroll', debouncedFadeOut);

    ko.utils.domNodeDisposal.addDisposeCallback(element, () => {
      element.removeEventListener('mouseenter', fadeIn);
      element.removeEventListener('mouseleave', fadeOut);
      element.removeEventListener('mousemove', fadeIn);
      element.removeEventListener('mousemove', debouncedFadeOut);
      element.removeEventListener('scroll', fadeIn);
      element.removeEventListener('scroll', debouncedFadeOut);
    });
  },
};

ko.bindingHandlers.simplebar = {
  init(element, valueAccessor) {
    const {trigger = valueAccessor(), onInit} = valueAccessor();
    const simpleBar = new SimpleBar(element, {autoHide: false});
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
    if (Runtime.isDesktopApp()) {
      $(element).remove();
    }
  },
};

ko.bindingHandlers.visibility = (function () {
  const setVisibility = (element: Element, valueAccessor: () => boolean) => {
    const hidden = ko.unwrap(valueAccessor());
    $(element).css('visibility', hidden ? 'visible' : 'hidden');
  };
  return {
    init: setVisibility,
    update: setVisibility,
  };
})();

/**
 * Add 'hide-controls' when the mouse leave the element or stops moving.
 */
ko.bindingHandlers.hide_controls = {
  init(element, valueAccessor) {
    const {timeout = valueAccessor(), skipClass} = valueAccessor();
    let hide_timeout: number = undefined;
    const startTimer = () => {
      hide_timeout = window.setTimeout(() => {
        element.classList.add('hide-controls');
      }, timeout);
    };

    element.onmouseenter = function () {
      element.classList.remove('hide-controls');
    };

    element.onmouseleave = function () {
      if (document.hasFocus()) {
        return element.classList.add('hide-controls');
      }
    };

    element.onmousemove = function ({target}: MouseEvent) {
      window.clearTimeout(hide_timeout);

      element.classList.remove('hide-controls');

      let node = target as Element;
      while (node && node !== element) {
        if (node.classList.contains(skipClass)) {
          return;
        }
        node = node.parentNode as Element;
      }
      startTimer();
    };

    startTimer();
  },
};

/**
 * Element is added to view.
 */
ko.bindingHandlers.added_to_view = {
  init(_element, valueAccessor) {
    const callback = valueAccessor();
    callback();
  },
};

/**
 * Element is removed from view
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
    const {onVisible = valueAccessor(), container} = valueAccessor();
    if (!onVisible) {
      return;
    }

    const releaseTrackers = () => {
      overlayedObserver.removeElement(element);
      viewportObserver.removeElement(element);
    };

    let inViewport = false;
    let visible = false;
    const triggerCallbackIfVisible = () => {
      if (inViewport && visible) {
        onVisible();
        releaseTrackers();
      }
    };

    viewportObserver.trackElement(
      element,
      (isInViewport: boolean) => {
        inViewport = isInViewport;
        triggerCallbackIfVisible();
      },
      container,
      true,
    );
    overlayedObserver.trackElement(element, isVisible => {
      visible = isVisible;
      triggerCallbackIfVisible();
    });

    ko.utils.domNodeDisposal.addDisposeCallback(element, releaseTrackers);
  },
};

ko.bindingHandlers.tooltip = {
  update(element, valueAccessor) {
    const {text = valueAccessor(), position, disabled} = valueAccessor();
    if (!disabled) {
      element.classList.add('with-tooltip', `with-tooltip--${position === 'bottom' ? 'bottom' : 'top'}`);
      element.setAttribute('data-tooltip', text);
    }
  },
};

/**
 * Suppresses the click event if we are in the macOs wrapper and are dragging the window
 */
ko.bindingHandlers.clickOrDrag = {
  init(element, valueAccessor, allBindings, viewModel, bindingContext) {
    const isMacDesktop = Runtime.isDesktopApp() && Runtime.isMacOS();
    const context = bindingContext.$data;
    const callback = valueAccessor().bind(context, context);
    if (!isMacDesktop) {
      return element.addEventListener('click', callback);
    }

    let isMoved = false;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    element.addEventListener('mousedown', ({screenX, screenY}: MouseEvent) => {
      isDragging = true;
      isMoved = false;
      startX = screenX;
      startY = screenY;
    });

    element.addEventListener('mousemove', ({screenX, screenY}: MouseEvent) => {
      if (isDragging && !isMoved) {
        const diffX = Math.abs(startX - screenX);
        const diffY = Math.abs(startY - screenY);
        if (diffX > 1 || diffY > 1) {
          isMoved = true;
        }
      }
    });

    element.addEventListener('mouseup', (event: MouseEvent) => {
      if (!isMoved) {
        callback(event);
      }
      isDragging = false;
    });
  },
};
