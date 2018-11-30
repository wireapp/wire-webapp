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

import keyboardJS from 'keyboardjs';

window.z = window.z || {};
window.z.ui = z.ui || {};

z.ui.Modal = class Modal {
  static get CLASS() {
    return {
      FADE_IN: 'modal-fadein',
      SHOW: 'modal-show',
    };
  }

  constructor(modal, hideCallback, beforeHideCallback) {
    this._hide = this._hide.bind(this);
    this.handleClick = this.handleClick.bind(this);

    this.modal = typeof modal === 'string' ? document.querySelector(modal) : modal;
    this.hideCallback = hideCallback;
    this.beforeHideCallback = beforeHideCallback;

    this.autoclose = true;

    keyboardJS.bind('esc', this._hide);

    if (this.modal) {
      this.modal.addEventListener('click', this.handleClick);
    }
  }

  handleClick(event) {
    if (event.target === this.modal) {
      this._hide();
    }
  }

  _hide() {
    if (this.autoclose) {
      this.hide();
    }
  }

  show() {
    if (this.modal) {
      this.modal.classList.add(Modal.CLASS.SHOW);
      setTimeout(() => this.modal.classList.add(Modal.CLASS.FADE_IN), 50);
    }
  }

  hide(callback) {
    this.callOptional(this.beforeHideCallback);

    if (this.modal) {
      this.modal.classList.remove(Modal.CLASS.FADE_IN);
      const transitionendPromise = new Promise(resolve => this.modal.addEventListener('transitionend', resolve));
      const timeoutPromise = new Promise(resolve => {
        const {transitionDelay, transitionDuration} = getComputedStyle(this.modal, '::before');

        const delays = transitionDelay.split(',').map(parseFloat);
        const durations = transitionDuration.split(',').map(parseFloat);

        const totals = delays.map((delay, index) => delay + durations[index]);
        const longestDelay = Math.max(...totals);

        setTimeout(resolve, longestDelay * 1000);
      });

      Promise.race([transitionendPromise, timeoutPromise]).then(() => {
        if (this.modal) {
          this.modal.classList.remove(Modal.CLASS.SHOW);
        }
        this.callOptional(this.hideCallback);
        this.callOptional(callback);
      });
    }
  }

  callOptional(fn) {
    if (typeof fn === 'function') {
      return fn();
    }
  }

  toggle() {
    if (this.isShown()) {
      this.hide();
    } else {
      this.show();
    }
  }

  isShown() {
    return !!this.modal && this.modal.classList.contains(Modal.CLASS.SHOW);
  }

  isHidden() {
    return !this.isShown();
  }

  setAutoclose(autoclose) {
    this.autoclose = autoclose;
  }

  destroy() {
    if (this.modal) {
      this.modal.removeEventListener('click', this.handleClick);
    }
    keyboardJS.unbind('esc', this._hide);
  }
};
