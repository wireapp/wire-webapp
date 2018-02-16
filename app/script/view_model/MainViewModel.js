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
window.z.ViewModel = z.ViewModel || {};

z.ViewModel.MainViewModel = class MainViewModel {
  constructor(element_id, user_repository) {
    this.user_repository = user_repository;
    this.logger = new z.util.Logger('z.ViewModel.MainViewModel', z.config.LOGGER.OPTIONS);

    this.user = this.user_repository.self;

    this.main_classes = ko.pureComputed(() => {
      if (this.user()) {
        // deprecated - still used on input control hover
        return `main-accent-color-${this.user().accent_id()} ${this.user().accent_theme()} show`;
      }
    });

    ko.applyBindings(this, document.getElementById(element_id));

    this.isLeftColumnOpen = ko.observable(true);
    this.isRightColumnOpen = ko.observable(false);
  }

  openRightColumn() {
    this.resize(document.querySelector('#left-column').clientWidth, 200);
    this.isRightColumnOpen(true);
  }

  closeRightColumn() {
    this.resize(document.querySelector('#left-column').clientWidth, 0);
    this.isRightColumnOpen(false);
  }

  resize(newWidthLeft, newWidthRight, duration = 100) {
    const smoothStep = x => (x > 1 ? 1 : x < 0 ? 0 : x * x * (3 - 2 * x));
    const lerp = (v1, v2, t) => v1 + (v2 - v1) * t;
    const setStyle = (el, size) => (el.style.minWidth = el.style.flexBasis = `${size}px`);

    const main = document.querySelector('#wire-main');
    const leftColumn = document.querySelector('#left-column');
    const centerColumn = document.querySelector('#center-column');
    const rightColumn = document.querySelector('#right-column');

    const oldWidthLeft = leftColumn.clientWidth;
    const oldWidthCenter = centerColumn.clientWidth;
    const oldWidthRight = rightColumn.clientWidth;

    const newWidthCenter = main.clientWidth - newWidthLeft - newWidthRight;

    const moveInLeft = oldWidthLeft === 0;
    const moveOutLeft = newWidthLeft === 0;

    const moveInRight = oldWidthRight === 0;
    const moveOutRight = newWidthRight === 0;

    const scaleLeft0 = moveInLeft || moveOutLeft ? 1 : oldWidthLeft / newWidthLeft;
    const scaleCenter0 = oldWidthCenter / newWidthCenter;
    const scaleRight0 = moveInRight || moveOutRight ? 1 : oldWidthRight / newWidthRight;

    const transLeft0 = moveInLeft ? -newWidthLeft : 0;
    const transCenter0 = moveOutLeft ? 0 : oldWidthLeft - newWidthLeft;
    const transRight0 = oldWidthCenter - newWidthCenter - (moveInLeft ? newWidthLeft : 0);

    const trans1 = moveOutLeft ? -oldWidthLeft : 0;

    leftColumn.style.transformOrigin = centerColumn.style.transformOrigin = rightColumn.style.transformOrigin = 'left';

    setStyle(leftColumn, newWidthLeft || oldWidthLeft);
    setStyle(centerColumn, newWidthCenter);
    setStyle(rightColumn, newWidthRight || oldWidthRight);

    const startTime = Date.now();
    function animate() {
      const currTime = Date.now() - startTime;
      if (currTime < duration) {
        requestAnimationFrame(animate);
      } else {
        leftColumn.style.transform = centerColumn.style.transform = rightColumn.style.transform = '';
        centerColumn.style.minWidth = centerColumn.style.flexBasis = '';
        setStyle(leftColumn, newWidthLeft);
        setStyle(rightColumn, newWidthRight);
        return;
      }
      const step = smoothStep(currTime / duration);
      leftColumn.style.transform = `scale(${lerp(scaleLeft0, 1, step)}, 1) translateX(${lerp(
        transLeft0,
        trans1,
        step
      )}px)`;
      centerColumn.style.transform = `scale(${lerp(scaleCenter0, 1, step)}, 1) translateX(${lerp(
        transCenter0,
        trans1,
        step
      )}px)`;
      rightColumn.style.transform = `scale(${lerp(scaleRight0, 1, step)}, 1) translateX(${lerp(
        transRight0,
        trans1,
        step
      )}px)`;
    }
    animate();
  }
};
