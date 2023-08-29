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

export type Routes = Record<string, ((x: any) => void) | null>;

const defaultRoute: Routes = {
  // do nothing if url was not matched
  '*': null,
};
let routes: Routes = {};

function parseRoute() {
  const currentPath = window.location.hash.replace('#', '') || '/';

  const {value} = switchPath(currentPath, routes);
  return typeof value === 'function' ? value() : value;
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
  window.history.replaceState(stateObj, '', `#${path}`);
};
