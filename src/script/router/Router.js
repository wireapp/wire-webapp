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

import switchPath from 'switch-path';

export class Router {
  constructor(routeDefinitions) {
    const defaultRoute = {
      // do nothing if url was not matched
      '*': null,
    };
    const routes = Object.assign({}, defaultRoute, routeDefinitions);

    const parseRoute = () => {
      const currentPath = window.location.hash.replace('#', '') || '/';

      const {value} = switchPath(currentPath, routes);
      return typeof value === 'function' ? value() : value;
    };

    /**
     * We need to proxy the replaceState method of history in order to trigger an event and warn the app that something happens.
     * This is needed because the replaceState method can be called from outside of the app (eg. in the desktop app)
     * @returns {void}
     */
    const originalReplaceState = window.history.replaceState.bind(window.history);

    window.history.replaceState = (...args) => {
      originalReplaceState(...args);
      parseRoute();
    };
    window.addEventListener('hashchange', parseRoute);

    // tigger an initial parsing of the current url
    parseRoute();
  }

  navigate(path) {
    window.history.replaceState(null, null, `#${path}`);
    return this;
  }
}
