/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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
    it('parses the current URL when instantiated', () => {
      const routes = {'/conv': jest.fn()};

      window.location.hash = '#/conv';
      configureRoutes(routes);

      expect(routes['/conv']).toHaveBeenCalled();
    });

    it('handles exact matches with parameters', () => {
      const routes = {'/conversation/:id': jest.fn()};

      window.location.hash = '#/conversation/123';
      configureRoutes(routes);

      expect(routes['/conversation/:id']).toHaveBeenCalledWith('123');
    });

    it('handles optional parameters', () => {
      const routes = {'/conversation/:id(/:domain)': jest.fn()};

      window.location.hash = '#/conversation/123/example.com';
      configureRoutes(routes);

      expect(routes['/conversation/:id(/:domain)']).toHaveBeenCalledWith('123', 'example.com');
    });

    it('handles wildcard segments', () => {
      const routes = {'/conversation/:id/files/*': jest.fn()};

      window.location.hash = '#/conversation/123/files/some/path';
      configureRoutes(routes);

      expect(routes['/conversation/:id/files/*']).toHaveBeenCalledWith('123', 'some/path');
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

      expect(routes.conversation).toHaveBeenCalledWith('uuid');
      expect(routes.user).not.toHaveBeenCalled();

      navigate('/user/uuid');

      expect(routes.user).toHaveBeenCalledWith('uuid');
    });

    it('handles complex routes with multiple parameters', () => {
      const routes = {complex: jest.fn()};

      configureRoutes({
        '/conversation/:id(/:domain)/files/*': routes.complex,
      });

      navigate('/conversation/123/example.com/files/some/path');

      expect(routes.complex).toHaveBeenCalledWith('123', 'example.com', 'some/path');
    });
  });

  describe('hash change event listener', () => {
    it('triggers routing when a hashchange event is triggered', async () => {
      const handlers = {conversation: jest.fn()};

      configureRoutes({'/conversation/:id': handlers.conversation});

      expect(handlers.conversation).not.toHaveBeenCalled();

      window.location.hash = '#/conversation/uuid';

      await waitFor(() => {
        expect(handlers.conversation).toHaveBeenCalledWith('uuid');
      });
    });
  });

  describe('setHistoryParam', () => {
    beforeEach(() => {
      global.history.replaceState = jest.fn();
    });

    afterEach(() => {
      (global.history.replaceState as jest.Mock).mockRestore();
    });

    it('uses history.state if it is not empty and stateObj is not provided', () => {
      const mockState = {eventKey: 'Enter'};
      Object.defineProperty(window.history, 'state', {value: mockState, writable: true});

      setHistoryParam('/path');
      expect(global.history.replaceState).toHaveBeenCalledWith(mockState, '', '#/path');
    });

    it('uses stateObj even if history.state is not empty', () => {
      const mockState = {eventKey: 'Tab'};
      Object.defineProperty(window.history, 'state', {value: mockState, writable: true});

      const newStateObj = {newState: 'state'};
      setHistoryParam('/path', newStateObj);
      expect(global.history.replaceState).toHaveBeenCalledWith(newStateObj, '', '#/path');
    });

    it('explicitly resetting the state is allowed', () => {
      const mockState = {eventKey: 'Tab'};
      Object.defineProperty(window.history, 'state', {value: mockState, writable: true});

      const newStateObj = {};
      setHistoryParam('/path', newStateObj);
      expect(global.history.replaceState).toHaveBeenCalledWith(newStateObj, '', '#/path');
    });
  });
});
