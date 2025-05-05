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

import {match} from 'path-to-regexp';

export type Routes = Record<string, ((...args: any[]) => void) | null>;

const defaultRoute: Routes = {
  '*': null,
};

let routes: Routes = {};

/**
 * Matches the current URL path against configured routes and triggers the appropriate handler.
 */
export const parseRoute = () => {
  const currentPath = window.location.hash.replace('#', '') || '/';
  console.log('Current path:', currentPath);
  console.log('Current path type:', typeof currentPath);
  console.log('Current path length:', currentPath.length);
  console.log(
    'Current path characters:',
    currentPath.split('').map(c => `${c} (${c.charCodeAt(0)})`),
  );
  console.log('Available routes:', Object.keys(routes));

  // Try to match the path directly
  const exactMatch = routes[currentPath];
  console.log('Exact match result:', exactMatch);
  if (exactMatch) {
    console.log('Found exact match');
    return exactMatch();
  }

  // Try to match with path-to-regexp
  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    }

    console.log('Trying pattern:', pattern);
    const matcher = match(pattern, {decode: decodeURIComponent});
    const result = matcher(currentPath);
    console.log('Pattern match result:', result);

    if (!result || !handler) {
      console.log('No match for pattern:', pattern);
      continue;
    }

    console.log('Matched pattern:', pattern);
    console.log('Match result:', result);

    const params = result.params;
    const paramNames = Object.keys(params);
    console.log('Parameter names:', paramNames);

    // Handle wildcard parameter
    if (paramNames.some(name => name.startsWith('*'))) {
      const wildcardName = paramNames.find(name => name.startsWith('*'));
      if (wildcardName) {
        const segments = params[wildcardName];
        console.log('Wildcard segments:', segments);
        console.log('Wildcard segments type:', typeof segments);
        console.log('Wildcard segments length:', Array.isArray(segments) ? segments.length : 0);
        return handler(...Object.values(params).filter(param => param !== segments), segments);
      }
    }

    // Handle optional parameters
    if (paramNames.length === 0) {
      return handler(params);
    }

    const paramValues = paramNames.map(name => params[name]);
    console.log('Parameter values:', paramValues);
    return handler(...paramValues);
  }

  console.log('No matching route found, using default route');
  return routes['*']?.();
};

export const configureRoutes = (routeDefinitions: Routes): void => {
  routes = {...defaultRoute, ...routeDefinitions};
  window.addEventListener('hashchange', parseRoute);
  parseRoute();
};
export const navigate = (path: string, stateObj?: {}) => {
  setHistoryParam(path, stateObj);
  parseRoute();
};

export const setHistoryParam = (path: string, stateObj: {} = window.history.state) => {
  window.location.hash = path;
};
