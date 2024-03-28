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

interface OverlayElement {
  onChange?: (isChanged: boolean) => void;
  onVisible?: () => void;
}

/**
 * Keeps track of elements that are overlayed by other elements (thus not visible on screen).
 */
const overlayedElements = new Map<HTMLElement, OverlayElement>();
let overlayCheckerInterval: number | undefined = undefined;

function checkOverlayedElements() {
  overlayedElements.forEach(({onVisible, onChange}, element) => {
    const isVisible = !isOverlayed(element);
    if (onChange) {
      return onChange(isVisible);
    }
    if (isVisible) {
      onVisible?.();
      removeElement(element);
    }
  });
}

/**
 * Returns `true` if an element is above the element being watched.
 *
 * @param domElement the element we want to check.
 */
const isOverlayed = (domElement: HTMLElement): boolean => {
  const box = domElement.getBoundingClientRect();
  if (isNaN(box.right + box.left + box.bottom + box.top)) {
    return true;
  }
  const middlePointX = (box.right + box.left) / 2;
  const middlePointY = (box.bottom + box.top) / 2;
  const elementAtPoint = document.elementFromPoint(middlePointX, middlePointY);
  return !!elementAtPoint && domElement !== elementAtPoint && !domElement.contains(elementAtPoint);
};

const onElementVisible = (element: HTMLElement, onVisible: () => void) => {
  if (!isOverlayed(element)) {
    return onVisible();
  }
  if (!overlayCheckerInterval) {
    overlayCheckerInterval = window.setInterval(checkOverlayedElements, 300);
  }
  overlayedElements.set(element, {onVisible});
};

const trackElement = (element: HTMLElement, onChange: (isChanged: boolean) => void) => {
  onChange(!isOverlayed(element));
  if (!overlayCheckerInterval) {
    overlayCheckerInterval = window.setInterval(checkOverlayedElements, 300);
  }
  overlayedElements.set(element, {onChange});
};

const removeElement = (element: HTMLElement) => {
  overlayedElements.delete(element);
  if (overlayedElements.size < 1 && overlayCheckerInterval) {
    clearInterval(overlayCheckerInterval);
    overlayCheckerInterval = undefined;
  }
};

export const overlayedObserver = {
  onElementVisible,
  removeElement,
  trackElement,
};
