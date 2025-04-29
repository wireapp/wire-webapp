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

export type Routes = Record<string, ((...args: any[]) => void) | null>;

const defaultRoute: Routes = {
  '*': null,
};

let routes: Routes = {};

function matchRoute(path: string): {handler: ((...args: any[]) => void) | null; params: string[]} {
  const pathWithoutQuery = path.split('?')[0];
  const pathSegments = pathWithoutQuery.split('/').filter(Boolean);

  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    }

    const patternSegments = pattern.split('/').filter(Boolean);
    if (patternSegments.length !== pathSegments.length) {
      continue;
    }

    const params: string[] = [];
    let match = true;

    for (let i = 0; i < patternSegments.length; i++) {
      const patternSegment = patternSegments[i];
      const pathSegment = pathSegments[i];

      if (patternSegment.startsWith(':')) {
        params.push(pathSegment);
      } else if (patternSegment !== pathSegment) {
        match = false;
        break;
      }
    }

    if (match) {
      return {handler, params};
    }
  }

  return {handler: routes['*'], params: []};
}

function parseRoute() {
  const currentPath = window.location.hash.replace('#', '') || '/';
  const {handler, params} = matchRoute(currentPath);

  if (handler) {
    handler(...params);
  }
}

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
  // Get current query parameters
  const currentHash = window.location.hash;
  const [, currentQuery] = currentHash.split('?');

  // Get new path and query parameters
  const [newPath, newQuery] = path.split('?');

  // Check if we're switching between files and conversation views
  const isSwitchingViews =
    (currentHash.includes('/files') && !newPath.includes('/files')) ||
    (!currentHash.includes('/files') && newPath.includes('/files'));

  // Use new query parameters if provided, otherwise keep current ones only if we're not switching views
  const query = newQuery || (!isSwitchingViews && currentQuery ? `?${currentQuery}` : '');

  window.history.replaceState(stateObj, '', `#${newPath}${query}`);
};
