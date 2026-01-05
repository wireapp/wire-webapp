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

import {getLogger} from './Logger';

const logger = getLogger('focusUtil');

/**
 * Returns back a NodeList of focusable elements
 * that exist within the passed parent HTMLElement, or
 * an empty array if no parent passed.
 *
 * @param {HTMLElement} parent HTML element
 * @param {Array} customSelector List of selectors not in the default list(optional)
 * @returns {(NodeList|Array)} The focusable elements that we can find
 */
export const getAllFocusableElements = (
  parent: Element,
  customSelector: string[] = [],
): NodeListOf<HTMLElement> | [] => {
  if (!parent) {
    logger.development.warn('You need to pass a parent HTMLElement');
    return []; // Return array so length queries will work
  }

  const defaultSelectors = `button:not([disabled]), [role="button"], [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), details:not([disabled]), summary:not(:disabled)`;
  const selectors = customSelector.length ? `${defaultSelectors}, ${[...customSelector]}` : `${defaultSelectors}`;
  return parent.querySelectorAll(selectors);
};

/**
 * Set tabindex for each interactive element based on the element's current focus
 * @param elements list of elements
 * @param isFocusable current message focus state
 */
export const setElementsTabIndex = (elements: NodeListOf<HTMLElement> | [], isFocusable: boolean) => {
  if (elements.length) {
    elements.forEach(element => {
      setElementTabIndex(element, isFocusable);
    });
  }
};

/**
 * Set tabindex for a single element based on the element's current focus
 * @param element an element
 * @param isFocusable current message focus state
 */
const setElementTabIndex = (element: Element, isFocusable: boolean) => {
  element.setAttribute('tabindex', isFocusable ? '0' : '-1');
};
