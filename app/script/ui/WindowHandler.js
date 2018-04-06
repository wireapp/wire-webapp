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

z.ui.WindowHandler = class WindowHandler {
  constructor() {
    this.init = this.init.bind(this);
    this._listenToWindowResize = this._listenToWindowResize.bind(this);
    this.logger = new z.util.Logger('z.ui.WindowHandler', z.config.LOGGER.OPTIONS);

    this.height = 0;
    this.width = 0;

    this.isVisible = true;

    return this;
  }

  init() {
    this.width = $(window).width();
    this.height = $(window).height();
    this._listenToUnhandledPromiseRejection();
    this._listenToWindowResize();

    document.addEventListener('visibilitychange', () => {
      const isVisible = document.visibilityState === 'visible';
      this.logger.info(`Webapp is ${isVisible ? 'visible' : 'hidden'}`);
    });

    return this;
  }

  _listenToWindowResize() {
    $(window).on('resize', () => {
      const currentHeight = $(window).height();
      const currentWidth = $(window).width();

      const changeInWidth = this.width - currentWidth;
      const changeInHeight = this.height - currentHeight;

      amplify.publish(z.event.WebApp.WINDOW.RESIZE.WIDTH, changeInWidth);
      amplify.publish(z.event.WebApp.WINDOW.RESIZE.HEIGHT, changeInHeight);

      this.width = currentWidth;
      this.height = currentHeight;
    });
  }

  _listenToUnhandledPromiseRejection() {
    $(window).on('unhandledrejection', event => {
      const promiseRejectionEvent = event.originalEvent;
      const error = promiseRejectionEvent.reason || {};

      const isDegraded = error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION;
      if (isDegraded) {
        this.logger.log('User has canceled sending a message to a degraded conversation.');
        promiseRejectionEvent.preventDefault();
        promiseRejectionEvent.stopPropagation();
        return false;
      }
    });
  }
};
