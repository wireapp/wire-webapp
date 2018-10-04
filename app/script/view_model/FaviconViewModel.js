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
window.z.viewModel = z.viewModel || {};

z.viewModel.FaviconViewModel = class FaviconViewModel {
  constructor(dispatcher) {
    this.dispatcher = dispatcher;
    this.unreadCount = ko.observable(0);

    this.unreadCountSubscription = this.unreadCount.subscribe(this._updateFavicon.bind(this));
    this.dispatcher.subscribe(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, this, this._updateUnreadCount);
  }

  _updateUnreadCount(unreadCount) {
    this.unreadCount(unreadCount);
  }

  _updateFavicon(unreadCount) {
    const iconBadge = unreadCount != 0 ? '-badge' : '';
    const link = document.querySelector("link[rel*='shortcut icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = `/image/favicon${iconBadge}.ico`;
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  dispose() {
    this.dispatcher.unsubscribe(z.event.WebApp.LIFECYCLE.UNREAD_COUNT, this, this._updateUnreadCount);
    this.unreadCountSubscription.dispose();
  }
};
