/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
    this._listen_to_window_resize = this._listen_to_window_resize.bind(this);
    this.logger = new z.util.Logger('z.ui.WindowHandler', z.config.LOGGER.OPTIONS);

    this.height = 0;
    this.width = 0;

    this.is_visible = true;

    return this;
  }

  init() {
    this.width = $(window).width();
    this.height = $(window).height();
    this._listen_to_unhandled_promise_rejection();
    this._listen_to_window_resize();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.logger.info('Webapp is visible');
        this.is_visible = true;
      } else {
        this.logger.info('Webapp is hidden');
        this.is_visible = false;
      }
    });
    return this;
  }

  _listen_to_window_resize() {
    return $(window).on('resize', () => {
      const current_height = $(window).height();
      const current_width = $(window).width();

      const change_in_width = this.width - current_width;
      const change_in_height = this.height - current_height;

      amplify.publish(z.event.WebApp.WINDOW.RESIZE.WIDTH, change_in_width);
      amplify.publish(z.event.WebApp.WINDOW.RESIZE.HEIGHT, change_in_height);

      this.width = current_width;
      return this.height = current_height;
    });
  }

  _listen_to_unhandled_promise_rejection() {
    return $(window).on('unhandledrejection', (event) => {
      const promise_rejection_event = event.originalEvent;
      const promise_error = promise_rejection_event.reason;

      if (promise_error && promise_error.type === z.conversation.ConversationError.TYPE.DEGRADED_CONVERSATION_CANCELLATION) {
        this.logger.log('User has canceled sending a message to a degraded conversation.');
        promise_rejection_event.preventDefault();
        promise_rejection_event.stopPropagation();
        return false;
      }
    });
  }
};
