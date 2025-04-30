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

import {match} from 'path-to-regexp';

export type Routes = Record<string, ((...args: any[]) => void) | null>;

const defaultRoute: Routes = {
  // do nothing if url was not matched
  '*': null,
};

let routes: Routes = {};

/**
 * Matches the current URL path against configured routes and triggers the appropriate handler.
 */
const parseCurrentUrlRoute = () => {
  const currentPath = window.location.hash.replace('#', '') || '/';
  console.log('Current path:', currentPath);

  const exactMatch = routes[currentPath];
  if (exactMatch) {
    return exactMatch();
  }

  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    }

    try {
      console.log('Trying pattern:', pattern);
      const matcher = match(pattern, {decode: decodeURIComponent});
      const result = matcher(currentPath);
      console.log('Match result:', result);

      if (!result || !handler) {
        continue;
      }

      const params = result.params;
      const paramNames = Object.keys(params);
      console.log('Matched params:', params);

      // Handle wildcard parameter
      if (params['*']) {
        return handler(...Object.values(params));
      }

      // Handle optional parameters
      if (paramNames.length === 0) {
        return handler(params);
      }

      const paramValues = paramNames.map(name => params[name]);
      return handler(...paramValues);
    } catch (error) {
      console.warn(`Failed to match route pattern "${pattern}":`, error);
      continue;
    }
  }

  return routes['*']?.();
};

export const configureRoutes = (routeDefinitions: Routes): void => {
  routes = {...defaultRoute, ...routeDefinitions};
  window.addEventListener('hashchange', parseCurrentUrlRoute);
  parseCurrentUrlRoute();
};

export const navigate = (path: string, stateObj?: {}) => {
  setHistoryParam(path, stateObj);
  parseCurrentUrlRoute();
};

export const setHistoryParam = (path: string, stateObj: {} = window.history.state) => {
  window.history.replaceState(stateObj, '', `#${path}`);
};
