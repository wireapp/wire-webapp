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

import {waitFor} from '@testing-library/react';

import {configureRoutes, navigate, setHistoryParam} from './Router';

describe('Router', () => {
  afterEach(() => {
    window.location.hash = '#';
  });

  describe('configureRoutes', () => {
    it('parse the current URL when instantiated', () => {
      const routes = {'/conv': jest.fn()};

      window.location.hash = '#/conv';
      configureRoutes(routes);

      expect(routes['/conv']).toHaveBeenCalled();
    });
  });

  describe('navigate', () => {
    it('allows to navigate to specific url and call the associated handler', () => {
      const routes = {conversation: jest.fn(), user: jest.fn()};

      configureRoutes({
        '/conversation/:id': routes.conversation,
        '/user/:id': routes.user,
      });

      navigate('/nomatch');

      expect(routes.conversation).not.toHaveBeenCalled();
      expect(routes.user).not.toHaveBeenCalled();

      navigate('/conversation/uuid');

      expect(routes.conversation).toHaveBeenCalled();
      expect(routes.user).not.toHaveBeenCalled();

      navigate('/user/uuid');

      expect(routes.user).toHaveBeenCalled();
    });
  });

  describe('hash change event listener', () => {
    it('triggers routing when a hashchange event is triggered', async () => {
      const handlers = {conversation: jest.fn()};

      configureRoutes({'/conversation/:id': handlers.conversation});

      expect(handlers.conversation).not.toHaveBeenCalled();

      window.location.hash = '#/conversation/uuid';

      waitFor(() => {
        expect(handlers.conversation).toHaveBeenCalled();
      });
    });
  });

  describe('setHistoryParam', () => {
    it('sets the window location hash with the provided path', () => {
      setHistoryParam('/test-path');
      expect(window.location.hash).toBe('#/test-path');
    });

    it('handles paths with or without leading slash', () => {
      setHistoryParam('test-path');
      expect(window.location.hash).toBe('#test-path');

      setHistoryParam('/test-path');
      expect(window.location.hash).toBe('#/test-path');
    });

    it('forces route re-evaluation when the hash is already at the target path', () => {
      jest.useFakeTimers();

      const routes = {'/': jest.fn()};
      configureRoutes(routes);
      routes['/'].mockClear();

      // Hash is already '/' (set by configureRoutes' initial parse), so the browser won't fire a
      // native hashchange event - setHistoryParam must force route re-evaluation itself.
      setHistoryParam('/');
      expect(routes['/']).not.toHaveBeenCalled();

      jest.runAllTimers();
      expect(routes['/']).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('does not force route re-evaluation when the hash actually changes', () => {
      jest.useFakeTimers();

      const routes = {'/': jest.fn(), '/other': jest.fn()};
      configureRoutes(routes);
      routes['/'].mockClear();

      setHistoryParam('/other');

      jest.runAllTimers();
      expect(routes['/']).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
