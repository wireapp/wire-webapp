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

/**
 * Keeps track of elements that are overlayed by other elements (thus not visible on screen).
 *
 */
// keeps track of all the elements we need to check when there is a mutation
const overlayedElements = new Map();
let overlayCheckerInterval = undefined;

function checkOverlayedElements() {
  overlayedElements.forEach(({onVisible, onChange}, element) => {
    const isVisible = !isOverlayed(element);
    if (onChange) {
      return onChange(isVisible);
    }
    if (isVisible) {
      onVisible();
      removeElement(element);
    }
  });
}

/**
 * Returns `true` if an element is above the element being watched.
 *
 * @param {HTMLElement} domElement the element we want to check.
 * @returns {boolean} Is the element overlayed.
 */
const isOverlayed = domElement => {
  const box = domElement.getBoundingClientRect();
  const middlePointX = (box.right + box.left) / 2;
  const middlePointY = (box.bottom + box.top) / 2;
  const elementAtPoint = document.elementFromPoint(middlePointX, middlePointY);
  return elementAtPoint && domElement !== elementAtPoint && !domElement.contains(elementAtPoint);
};

const onElementVisible = (element, onVisible) => {
  if (!isOverlayed(element)) {
    return onVisible();
  }
  if (!overlayCheckerInterval) {
    overlayCheckerInterval = setInterval(checkOverlayedElements, 300);
  }
  overlayedElements.set(element, {onVisible});
};

const trackElement = (element, onChange) => {
  onChange(!isOverlayed(element));
  if (!overlayCheckerInterval) {
    overlayCheckerInterval = setInterval(checkOverlayedElements, 300);
  }
  overlayedElements.set(element, {onChange});
};

const removeElement = element => {
  overlayedElements.delete(element);
  if (overlayedElements.size < 1 && overlayCheckerInterval) {
    clearInterval(overlayCheckerInterval);
    overlayCheckerInterval = undefined;
  }
};

const overlayedObserver = {
  onElementVisible,
  removeElement,
  trackElement,
};

export {overlayedObserver};
