/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {Router} from 'src/script/router/Router';

describe('Router', () => {
  let originalReplaceStateFn;

  beforeEach(() => {
    originalReplaceStateFn = window.history.replaceState;
  });

  afterEach(() => {
    window.location.hash = '#';
    window.history.replaceState = originalReplaceStateFn;
  });

  describe('constructor', () => {
    it("overwrites browser's replaceState method", () => {
      const originalReplaceState = window.history.replaceState;
      new Router();

      expect(originalReplaceState).not.toBe(window.history.replaceState);
    });

    it('parse the current URL when instantiated', () => {
      const routes = {'/conv': () => {}};
      spyOn(routes, '/conv');

      window.location.hash = '#/conv';
      new Router(routes);

      expect(routes['/conv']).toHaveBeenCalled();
    });
  });

  describe('navigate', () => {
    it('allows to navigate to specific url and call the associated handler', () => {
      const handlers = {conversation: () => {}, user: () => {}};

      spyOn(handlers, 'conversation');
      spyOn(handlers, 'user');

      const router = new Router({
        '/conversation/:id': handlers.conversation,
        '/user/:id': handlers.user,
      });

      router.navigate('/nomatch');

      expect(handlers.conversation).not.toHaveBeenCalled();
      expect(handlers.user).not.toHaveBeenCalled();

      router.navigate('/conversation/uuid');

      expect(handlers.conversation).toHaveBeenCalled();
      expect(handlers.user).not.toHaveBeenCalled();

      router.navigate('/user/uuid');

      expect(handlers.user).toHaveBeenCalled();
    });
  });

  describe('history.replaceState proxy', () => {
    it('calls the matching handler when a new state is replaced', () => {
      const routes = {
        '/conversation/:id': () => {},
        '/user/:id': () => {},
      };

      spyOn(routes, '/conversation/:id');
      spyOn(routes, '/user/:id');

      new Router(routes);

      window.history.replaceState('', '', '#/nomatch');

      expect(routes['/conversation/:id']).not.toHaveBeenCalled();
      expect(routes['/user/:id']).not.toHaveBeenCalled();

      window.history.replaceState('', '', '#/conversation/uuid');

      expect(routes['/conversation/:id']).toHaveBeenCalled();
      expect(routes['/user/:id']).not.toHaveBeenCalled();

      window.history.replaceState('', '', '#/user/uuid');

      expect(routes['/user/:id']).toHaveBeenCalled();
    });
  });
});
