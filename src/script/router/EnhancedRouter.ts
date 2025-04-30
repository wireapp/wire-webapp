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

export type Routes = Record<string, ((...args: any[]) => void) | null>;

const defaultRoute: Routes = {
  // do nothing if url was not matched
  '*': null,
};

let routes: Routes = {};

interface RouteMatch {
  handler: ((...args: any[]) => void) | null;
  params: Record<string, string>;
  query: Record<string, string>;
}

function parseQueryString(queryString: string): Record<string, string> {
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

function isOptionalParam(segment: string): boolean {
  return segment.startsWith('(') && segment.endsWith(')');
}

function extractOptionalParam(segment: string): string {
  return segment.slice(1, -1);
}

function matchRoute(path: string, routePattern: string): {match: boolean; params: Record<string, string>} {
  // Remove trailing slashes from both path and pattern
  const normalizedPath = path.replace(/\/+$/, '');
  const normalizedPattern = routePattern.replace(/\/+$/, '');

  const pathSegments = normalizedPath.split('/').filter(Boolean);
  const patternSegments = normalizedPattern.split('/').filter(Boolean);

  const params: Record<string, string> = {};
  let match = true;
  let pathIndex = 0;

  for (let i = 0; i < patternSegments.length; i++) {
    const patternSegment = patternSegments[i];
    const pathSegment = pathSegments[pathIndex];

    if (isOptionalParam(patternSegment)) {
      // Handle optional parameter
      const optionalSegment = extractOptionalParam(patternSegment);
      if (optionalSegment.startsWith(':')) {
        const paramName = optionalSegment.slice(1);
        if (pathSegment) {
          params[paramName] = pathSegment;
          pathIndex++;
        }
      } else if (pathSegment === optionalSegment) {
        pathIndex++;
      }
    } else if (patternSegment.startsWith(':')) {
      // Handle required parameter
      if (!pathSegment) {
        match = false;
        break;
      }
      const paramName = patternSegment.slice(1);
      params[paramName] = pathSegment;
      pathIndex++;
    } else if (patternSegment === '*') {
      // Handle wildcard - capture remaining segments
      if (pathIndex < pathSegments.length) {
        params['*'] = pathSegments.slice(pathIndex).join('/');
      }
      break;
    } else if (patternSegment !== pathSegment) {
      match = false;
      break;
    } else {
      pathIndex++;
    }
  }

  // Check if we've matched all path segments
  if (pathIndex < pathSegments.length) {
    match = false;
  }

  return {match, params};
}

function findRouteMatch(path: string): RouteMatch | null {
  const [pathWithoutQuery, queryString] = path.split('?');
  const query = queryString ? parseQueryString(queryString) : {};

  // Try exact matches first
  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === pathWithoutQuery) {
      return {handler, params: {}, query};
    }
  }

  // Try pattern matches
  for (const [pattern, handler] of Object.entries(routes)) {
    if (pattern === '*') {
      continue;
    } // Skip catch-all for now

    const {match, params} = matchRoute(pathWithoutQuery, pattern);
    if (match) {
      return {handler, params, query};
    }
  }

  // Try catch-all route
  if (routes['*']) {
    return {handler: routes['*'], params: {}, query};
  }

  return null;
}

function parseRoute() {
  const currentPath = window.location.hash.replace('#', '') || '/';
  const match = findRouteMatch(currentPath);

  if (match && match.handler) {
    // For route handlers that expect individual parameters, pass them as arguments
    // For handlers that expect an object, pass the combined params
    const handler = match.handler;
    const params = {...match.params, ...match.query};

    // Check if the handler expects individual parameters
    const paramNames = Object.keys(match.params);
    if (paramNames.length > 0) {
      // Pass parameters in the order they appear in the route pattern
      const paramValues = paramNames.map(name => params[name]);
      return handler(...paramValues);
    }
    // Pass as a single object
    return handler(params);
  }

  return null;
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
