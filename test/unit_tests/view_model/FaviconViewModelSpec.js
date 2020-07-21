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

import {WebAppEvents} from '@wireapp/webapp-events';
import {FaviconViewModel} from 'src/script/view_model/FaviconViewModel';

describe('FaviconViewModel', () => {
  it('subscribes to uread count events', () => {
    const dispatcher = {subscribe: () => {}};
    spyOn(dispatcher, 'subscribe').and.returnValue(undefined);

    const faviconViewModel = new FaviconViewModel(dispatcher);

    expect(dispatcher.subscribe).toHaveBeenCalledWith(
      WebAppEvents.LIFECYCLE.UNREAD_COUNT,
      faviconViewModel,
      faviconViewModel.updateUnreadCount,
    );
  });

  describe('updateUnreadCount', () => {
    let faviconViewModel;
    let dispatcher;

    beforeEach(() => {
      dispatcher = {...window.amplify};
      faviconViewModel = new FaviconViewModel(dispatcher);
    });

    afterEach(() => {
      faviconViewModel.dispose();
    });

    it('updates internal unread count state according to incoming events', () => {
      const unreads = [1, 2, 3, 4, 0];
      unreads.forEach(unread => {
        dispatcher.publish(WebAppEvents.LIFECYCLE.UNREAD_COUNT, unread);

        expect(faviconViewModel.unreadCount()).toBe(unread);
      });
    });

    it('updates the favicon according to the number of unreadCount', () => {
      const tests = [
        {faviconName: 'favicon-badge.ico', unreadCount: 1},
        {faviconName: 'favicon-badge.ico', unreadCount: 2},
        {faviconName: 'favicon-badge.ico', unreadCount: 3},
        {faviconName: 'favicon.ico', unreadCount: 0},
      ];

      tests.forEach(({faviconName, unreadCount}) => {
        faviconViewModel.unreadCount(unreadCount);
        const faviconLink = document.querySelector('link[rel*=icon]');

        expect(faviconLink.href).toContain(faviconName);
      });
    });
  });
});
