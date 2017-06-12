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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.content = z.ViewModel.content || {};

z.ViewModel.content.ConnectRequestsViewModel = class ConnectRequestsViewModel {
  /**
   * View model for connection requests.
   * @param {string} element_id - HTML selector
   * @param {z.user.UserRepository} user_repository - User repository
   */
  constructor(element_id, user_repository) {
    this.after_render = this.after_render.bind(this);
    this.click_on_accept = this.click_on_accept.bind(this);
    this.click_on_ignore = this.click_on_ignore.bind(this);

    this.user_repository = user_repository;
    this.logger = new z.util.Logger(
      'z.ViewModel.content.ConnectRequestsViewModel',
      z.config.LOGGER.OPTIONS
    );

    this.connect_requests = this.user_repository.connect_requests;

    this.should_update_scrollbar = ko
      .computed(() => {
        return this.connect_requests();
      })
      .extend({notify: 'always', rateLimit: 500});
  }

  /**
   * Called after each connection request is rendered.
   * @param {Object} elements - rendered objects
   * @param {z.entity.User} request - Rendered connection request
   * @returns {undefined} No return value
   */
  after_render(elements, request) {
    if (z.util.ArrayUtil.is_last_item(this.connect_requests(), request)) {
      window.requestAnimationFrame(() =>
        $('.connect-requests').scroll_to_bottom()
      );
    }
  }

  /**
   * Click on accept.
   * @param {z.entity.User} user_et - User to accept connection request from
   * @returns {undefined} No return value
   */
  click_on_accept(user_et) {
    this.user_repository.accept_connection_request(
      user_et,
      this.connect_requests().length === 1
    );
  }

  /**
   * Click on ignore.
   * @param {z.entity.User} user_et - User to ignore connection request from
   * @returns {undefined} No return value
   */
  click_on_ignore(user_et) {
    this.user_repository.ignore_connection_request(user_et);
  }
};
