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
const onIntersect = entries => {
  entries.forEach(({isIntersecting, target: element}) => {
    if (isIntersecting) {
      const onElementIntersects = observedElements.get(element);
      _removeElement(element);
      if (onElementIntersects) {
        onElementIntersects();
      }
    }
  });
};

const options = {root: null, rootMargin: '0px', threshold: 0.0};
const fullyInViewObserver = new IntersectionObserver(onIntersect, Object.assign({}, options, {threshold: 1.0}));
const justAppearedObserver = new IntersectionObserver(onIntersect, options);

const _addElement = (element, callback, fullyInView) => {
  observedElements.set(element, callback);
  return fullyInView ? fullyInViewObserver.observe(element) : justAppearedObserver.observe(element);
};

const _removeElement = element => {
  observedElements.delete(element);
  fullyInViewObserver.unobserve(element);
  justAppearedObserver.unobserve(element);
};

const viewportObserver = {
  addElement: _addElement,
  removeElement: _removeElement,
};

export default viewportObserver;
