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

import React, {forwardRef, useRef} from 'react';

import {useDebouncedCallback} from 'use-debounce';

const rgbaAlphaComponentIndex = 3;

const config = {
  ANIMATION_STEP: 0.05,
  DEBOUNCE_THRESHOLD: 1000,
};

const animations = {
  fadein: {step: config.ANIMATION_STEP, goal: 1},
  fadeout: {step: -config.ANIMATION_STEP, goal: 0},
};

export function parseColor(color: string): [number, number, number, number] {
  const el = document.body.appendChild(document.createElement('thiselementdoesnotexist'));
  el.style.color = color;
  const col = getComputedStyle(el).color;
  document.body.removeChild(el);
  const [, r, g, b, a = 1] = /rgba?\((\d+), *(\d+), *(\d+),? *(\d*\.?\d*)?\)/.exec(col) ?? [0, 0, 0, 0, 1];
  return [+r, +g, +b, +a];
}

const fadeStep = (state: number, {step, goal}: {step: number; goal: number}) => {
  const hasReachedGoal = step < 0 ? state <= goal : state >= goal;
  if (hasReachedGoal) {
    return false;
  }
  return state + step;
};

export const FadingScrollbar = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => {
  const isAnimating = useRef(false);
  const initalColor = useRef<[number, number, number, number] | undefined>(undefined);
  const currentAlpha = useRef<number>(0);

  const getInitialColor = (element: HTMLElement) => {
    if (initalColor.current === undefined) {
      initalColor.current = parseColor(window.getComputedStyle(element).getPropertyValue('--scrollbar-color'));
      currentAlpha.current = initalColor.current[rgbaAlphaComponentIndex];
    }
    return initalColor.current;
  };

  function animate(animation: 'fadein' | 'fadeout', element: HTMLElement) {
    const newColor = getInitialColor(element).slice();
    const nextAlpha = fadeStep(currentAlpha.current, animations[animation]);
    if (nextAlpha === false) {
      isAnimating.current = false;
      return;
    }
    newColor[rgbaAlphaComponentIndex] = nextAlpha;
    element.style.setProperty('--scrollbar-color', `rgba(${newColor})`);
    currentAlpha.current = nextAlpha;
    isAnimating.current = true;
    window.requestAnimationFrame(() => {
      return animate(animation, element);
    });
  }

  function startAnimation(animation: 'fadein' | 'fadeout', element: HTMLElement) {
    if (!isAnimating.current) {
      animate(animation, element);
    }
  }

  const fadeIn = (element: HTMLElement) => {
    return startAnimation('fadein', element);
  };
  const fadeOut = (element: HTMLElement) => {
    return startAnimation('fadeout', element);
  };

  const debouncedFadeOut = useDebouncedCallback((element: HTMLElement) => {
    return fadeOut(element);
  }, config.DEBOUNCE_THRESHOLD);

  const fadeInIdle = (element: HTMLElement) => {
    fadeIn(element);
    debouncedFadeOut(element);
  };

  return (
    <div
      onMouseEnter={event => {
        return fadeInIdle(event.currentTarget);
      }}
      onMouseLeave={event => {
        return fadeOut(event.currentTarget);
      }}
      onMouseMove={event => {
        return fadeInIdle(event.currentTarget);
      }}
      onScroll={event => {
        return fadeInIdle(event.currentTarget);
      }}
      ref={ref}
      {...props}
    />
  );
});

FadingScrollbar.displayName = 'FadingScrollbar';
