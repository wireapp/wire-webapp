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
  const observedElements = new Map();
  const intersectionObserver = (() => {
    const onIntersect = entries => {
      entries.forEach(({isIntersecting, target: element}) => {
        if (isIntersecting) {
          intersectionObserver.unobserve(element);

          const onElementIntersects = observedElements.get(element);
          if (onElementIntersects) {
            onElementIntersects();
            _removeElement(element);
          }
        }
      });
    };

    const options = {root: null, rootMargin: '0px', threshold: 0.0};
    return new IntersectionObserver(onIntersect, options);
  })();

  const _addElement = (element, callback) => {
    observedElements.set(element, callback);
    intersectionObserver.observe(element);
  };

  const _removeElement = element => {
    observedElements.delete(element);
    intersectionObserver.unobserve(element);
  };

  return {
    addElement: _addElement,
    removeElement: _removeElement,
  };
})();
