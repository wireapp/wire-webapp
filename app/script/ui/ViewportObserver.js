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

window.z = window.z || {};
window.z.ui = z.ui || {};

z.ui.ViewportObserver = (() => {
  let intersectionObserver = undefined;
  const observedElements = [];

  const _addElement = (element, callback) => {
    if (!intersectionObserver) {
      _createObserver();
    }
    observedElements.push({callback, element});
    intersectionObserver.observe(element);
  };

  const _createObserver = () => {
    const onIntersect = entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const trackedElement = _getObservedElement(entry.target);
          trackedElement.callback();
          intersectionObserver.unobserve(trackedElement.element);
          _removeObservedElement(trackedElement);
        }
      });
    };

    const options = {root: null, rootMargin: '0px', threshold: 0.0};
    intersectionObserver = new IntersectionObserver(onIntersect, options);
    return intersectionObserver;
  };

  const _getObservedElement = requestedElement => observedElements.find(({element}) => element === requestedElement);

  const _removeElement = element => {
    const observedElement = _getObservedElement(element);
    if (observedElement) {
      _removeObservedElement(observedElement);
    }
    intersectionObserver.unobserve(element);
  };

  const _removeObservedElement = observedElement => {
    observedElements.splice(observedElements.indexOf(observedElement), 1);
  };

  return {
    addElement: _addElement,
    removeElement: _removeElement,
  };
})();
