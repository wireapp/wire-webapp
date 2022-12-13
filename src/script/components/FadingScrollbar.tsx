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

import {debounce} from 'underscore';

const config = {
  ANIMATION_STEP: 0.05,
  DEBOUNCE_THRESHOLD: 1000,
};

function parseColor(color: string): [number, number, number, number] {
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
  const initalColor = useRef<[number, number, number, number]>();
  const currentAlpha = useRef<number>(1);

  const getInitialColor = (element: HTMLElement) => {
    if (!initalColor.current) {
      initalColor.current = parseColor(window.getComputedStyle(element).getPropertyValue('--scrollbar-color'));
    }
    return initalColor.current;
  };

  function animate(animation: 'fadein' | 'fadeout', element: HTMLElement) {
    const modifiers = {
      fadein: {step: config.ANIMATION_STEP, goal: 1},
      fadeout: {step: -config.ANIMATION_STEP, goal: 0},
    };

    const nextAlpha = fadeStep(currentAlpha.current, modifiers[animation]);
    if (nextAlpha === false) {
      isAnimating.current = false;
      return;
    }
    const newColor = getInitialColor(element).slice();
    newColor[3] = nextAlpha;
    element.style.setProperty('--scrollbar-color', `rgba(${newColor})`);
    currentAlpha.current = nextAlpha;
    isAnimating.current = true;
    window.requestAnimationFrame(() => animate(animation, element));
  }

  function setAnimationState(animation: 'fadein' | 'fadeout', element: HTMLElement) {
    if (!isAnimating.current) {
      animate(animation, element);
    }
  }

  const fadeIn = (element: HTMLElement) => setAnimationState('fadein', element);
  const fadeOut = (element: HTMLElement) => setAnimationState('fadeout', element);
  const debouncedFadeOut = debounce(fadeOut, config.DEBOUNCE_THRESHOLD);
  const fadeInIdle = (element: HTMLElement) => {
    fadeIn(element);
    debouncedFadeOut(element);
  };

  return (
    <div
      onMouseEnter={event => fadeInIdle(event.currentTarget)}
      onMouseLeave={event => fadeOut(event.currentTarget)}
      onMouseMove={event => fadeInIdle(event.currentTarget)}
      onScroll={event => fadeInIdle(event.currentTarget)}
      ref={ref}
      {...props}
    />
  );
});

FadingScrollbar.displayName = 'FadingScrollbar';
