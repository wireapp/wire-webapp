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

export class Router {
  private readonly parseRoute: () => any;

  constructor(routeDefinitions: Routes) {
    const defaultRoute: Routes = {
      // do nothing if url was not matched
      '*': null,
    };
    const routes = {...defaultRoute, ...routeDefinitions};

    this.parseRoute = () => {
      const currentPath = window.location.hash.replace('#', '') || '/';

      const {value} = switchPath(currentPath, routes);
      return typeof value === 'function' ? value() : value;
    };

    window.addEventListener('hashchange', this.parseRoute);

    // trigger an initial parsing of the current URL
    this.parseRoute();
  }

  navigate(path: string): Router {
    window.history.replaceState(null, null, `#${path}`);
    this.parseRoute();
    return this;
  }
}
