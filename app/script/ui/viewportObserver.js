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
const tolerance = 0.9;
const onIntersect = entries => {
  entries.forEach(({isIntersecting, intersectionRatio, target: element}) => {
    if (isIntersecting) {
      const {callback, fullyInView, container} = observedElements.get(element);
      if (!callback) {
        return _removeElement(element);
      }

      if (!fullyInView && isIntersecting) {
        _removeElement(element);
        return callback();
      }

      const minRatio = container ? Math.min(1, container.scrollHeight / element.scrollHeight) : 1;

      if (intersectionRatio > minRatio * tolerance) {
        _removeElement(element);
        return callback();
      }
    }
  });
};

const percentages = Array.from({length: 101}, (_, index) => index / 100);

const options = {root: null, rootMargin: '0px', threshold: percentages};
const observer = new IntersectionObserver(onIntersect, options);

const _addElement = (element, callback, fullyInView, container) => {
  observedElements.set(element, {callback, container, fullyInView});
  return observer.observe(element);
};

const _removeElement = element => {
  observedElements.delete(element);
  observer.unobserve(element);
};

const viewportObserver = {
  addElement: _addElement,
  removeElement: _removeElement,
};

export default viewportObserver;
