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

const observedElements = new Map();
const tolerance = 0.8;

const onIntersect: IntersectionObserverCallback = entries => {
  entries.forEach(({intersectionRatio, intersectionRect, isIntersecting, target: element}) => {
    const {onVisible, onChange, fullyInView, container} = observedElements.get(element) || {};
    const isFullyInView = () => {
      if (container) {
        const minHeight = Math.min(container.clientHeight, element.clientHeight) * tolerance;
        return intersectionRect.height >= minHeight;
      }
      return intersectionRatio >= tolerance;
    };
    const isVisible = isIntersecting && (!fullyInView || isFullyInView());

    if (onChange) {
      onChange(isVisible);
    } else if (isVisible) {
      removeElement(element);
      return onVisible && onVisible();
    }
  });
};

const stepCount = 100;
const thresholdSteps = Array.from({length: stepCount + 1}, (_, index) => index / stepCount);

const options: IntersectionObserverInit = {root: null, rootMargin: '0px', threshold: thresholdSteps};
const observer = new IntersectionObserver(onIntersect, options);

/**
 * Will track an element and trigger the callback only once when the element appears in viewport.
 *
 * @param element the element to observe
 * @param onVisible the callback to call when the element appears
 * @param fullyInView should the element be fully in view
 * @param container the element containing the element
 */
const onElementInViewport = (
  element: HTMLElement,
  onVisible: Function,
  fullyInView?: boolean,
  container?: HTMLElement,
): void => {
  observedElements.set(element, {container, fullyInView, onVisible});
  return observer.observe(element);
};

/**
 * Will track an element and trigger the callback whenever the intersecting state changes
 *
 * @param element the element to observe
 * @param onChange the callback to call when the element intersects or not
 * @param fullyInView should the element be fully in view
 * @param container the element containing the element
 */
const trackElement = (element: HTMLElement, onChange: Function, fullyInView: boolean, container: HTMLElement): void => {
  observedElements.set(element, {container, fullyInView, onChange});
  return observer.observe(element);
};

const removeElement = (element: Element) => {
  observedElements.delete(element);
  observer.unobserve(element);
};

export const viewportObserver = {
  onElementInViewport,
  removeElement,
  trackElement,
};
