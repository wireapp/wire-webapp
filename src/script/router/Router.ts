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

import {matchRoute} from './routeMatcher';

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

  const exactMatch = routes[currentPath];
  if (exactMatch) {
    return exactMatch();
  }

  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    }

    const {match, params} = matchRoute({path: currentPath, pattern});
    if (!match || !handler) {
      continue;
    }

    const paramNames = Object.keys(params);
    if (paramNames.length === 0) {
      return handler(params);
    }

    const paramValues = paramNames.map(name => params[name]);
    return handler(...paramValues);
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
