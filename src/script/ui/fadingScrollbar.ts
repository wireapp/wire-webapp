/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useLayoutEffect} from 'react';
import {debounce} from 'underscore';

export const useFadingScrollbar = (element: HTMLElement): void => {
  useLayoutEffect(() => {
    if (!element) {
      return undefined;
    }
    const animationSpeed = 0.05;

    function parseColor(color: string) {
      const el = document.body.appendChild(document.createElement('thiselementdoesnotexist'));
      el.style.color = color;
      const col = getComputedStyle(el).color;
      document.body.removeChild(el);
      const [, r, g, b, a = 1] = /rgba?\((\d+), *(\d+), *(\d+),? *(\d*\.?\d*)?\)/.exec(col) ?? [0, 0, 0, 0, 1];
      return [+r, +g, +b, +a];
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
      element.style.setProperty('--scrollbar-color', `rgba(${currentColor})`);
    };
    const fadeIn = () => setAnimationState('fadein');
    const fadeOut = () => setAnimationState('fadeout');
    const debouncedFadeOut = debounce(fadeOut, 1000);
    const fadeInIdle = () => {
      fadeIn();
      debouncedFadeOut();
    };

    const events = {
      mouseenter: fadeIn,
      mouseleave: fadeOut,
      mousemove: fadeInIdle,
      scroll: fadeInIdle,
    };

    Object.entries(events).forEach(([eventName, handler]) => element.addEventListener(eventName, handler));

    return () =>
      Object.entries(events).forEach(([eventName, handler]) => element.removeEventListener(eventName, handler));
  }, [element]);
};
