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

import type {WallClock} from '@enormora/wall-clock/wall-clock';
import {createWallClock} from '@enormora/wall-clock/wall-clock';
import {match} from 'path-to-regexp';

import {isConversationListTab, useSidebarStore} from '../page/leftSidebar/panels/conversations/useSidebarStore';

type Routes = Record<string, ((...args: any[]) => void | Promise<void>) | null>;

let routerWallClock: WallClock = createWallClock();

export const configureRouterWallClock = (wallClock: WallClock): void => {
  routerWallClock = wallClock;
};

const defaultRoute: Routes = {
  // do nothing if url was not matched
  '*': null,
};

let routes: Routes = {};

/**
 * Matches the current URL path against configured routes and triggers the appropriate handler.
 */
const parseRoute = () => {
  const currentPath = window.location.hash.replace('#', '') || '/';

  const exactMatch = routes[currentPath];
  if (exactMatch) {
    return exactMatch();
  }

  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    }

    try {
      const matcher = match(pattern, {decode: decodeURIComponent});
      const result = matcher(currentPath);

      if (!result || !handler) {
        continue;
      }

      const params = result.params;
      const paramNames = Object.keys(params);

      // Handle wildcard parameter
      if (paramNames.some(name => name.startsWith('*'))) {
        const wildcardName = paramNames.find(name => name.startsWith('*'));
        if (wildcardName) {
          const segments = params[wildcardName];
          return handler(...Object.values(params).filter(param => param !== segments), segments);
        }
      }

      // Handle optional parameters
      if (paramNames.length === 0) {
        return handler(params);
      }

      const paramValues = paramNames.map(name => params[name]);
      return handler(...paramValues);
    } catch (error: unknown) {
      console.error('Error matching pattern:', pattern, error);
      continue;
    }
  }

  return routes['*']?.();
};
export const configureRoutes = (routeDefinitions: Routes): void => {
  routes = {...defaultRoute, ...routeDefinitions};
  window.addEventListener('hashchange', parseRoute);
  parseRoute();
};
export const navigate = (path: string) => {
  setHistoryParam(path);
  parseRoute();
};

export const setHistoryParam = (path: string) => {
  const hashUnchanged = window.location.hash === `#${path}`;
  window.location.hash = path;

  if (hashUnchanged) {
    // Setting the hash to its current value does not fire a native `hashchange` event, so route
    // handlers that rely on it (e.g. re-showing the most recent conversation) would otherwise
    // never run. Force route re-evaluation async, matching the timing of a real hashchange, so
    // callers that synchronously update content state right after calling this still take effect
    // first.
    routerWallClock.setTimeout(() => {
      if (path === '/' && !isConversationListTab(useSidebarStore.getState().currentTab)) {
        return;
      }
      parseRoute();
    }, 0);
  }
};
