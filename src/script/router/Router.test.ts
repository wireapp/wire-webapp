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
    // Mock window.history.replaceState before each test
    beforeEach(() => {
      global.history.replaceState = jest.fn();
    });

    // Restore the original method after each test
    afterEach(() => {
      (global.history.replaceState as jest.Mock).mockRestore();
    });

    it('throws an error if history.state is not empty and stateObj is not provided', () => {
      Object.defineProperty(window.history, 'state', {value: {}, writable: true});

      expect(() => setHistoryParam('/path')).toThrow('stateObj must be provided when history.state is not empty.');
    });

    it('does not throw an error if history.state is empty and stateObj is not provided', () => {
      Object.defineProperty(window.history, 'state', {value: null, writable: true});

      expect(() => setHistoryParam('/path')).not.toThrow();
    });

    it('does not throw an error if history.state is not empty and stateObj is provided', () => {
      Object.defineProperty(window.history, 'state', {value: {}, writable: true}); // Temporarily override history.state for this test

      expect(() => setHistoryParam('/path', {})).not.toThrow();
    });
  });
});
