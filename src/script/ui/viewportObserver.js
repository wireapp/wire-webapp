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
const onIntersect = entries => {
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

const options = {root: null, rootMargin: '0px', threshold: thresholdSteps};
const observer = new IntersectionObserver(onIntersect, options);

/**
 * Will track an element and trigger the callback only once when the element appears in viewport.
 *
 * @param {HTMLElement} element the element to observe
 * @param {Function} onVisible the callback to call when the element appears
 * @param {boolean} [fullyInView] should the element be fully in view
 * @param {HTMLElement} [container] the element containing the element
 * @returns {void} nothing
 */
const onElementInViewport = (element, onVisible, fullyInView, container) => {
  observedElements.set(element, {container, fullyInView, onVisible});
  return observer.observe(element);
};

/**
 * Will track an element and trigger the callback whenever the intersecting state changes
 *
 * @param {HTMLElement} element the element to observe
 * @param {Function} onChange the callback to call when the element intersects or not
 * @param {boolean} fullyInView should the element be fully in view
 * @param {HTMLElement} container the element containing the element
 * @returns {void} - nothing
 */
const trackElement = (element, onChange, fullyInView, container) => {
  observedElements.set(element, {container, fullyInView, onChange});
  return observer.observe(element);
};

const removeElement = element => {
  observedElements.delete(element);
  observer.unobserve(element);
};

const viewportObserver = {
  onElementInViewport,
  removeElement,
  trackElement,
};

export {viewportObserver};
