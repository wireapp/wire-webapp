/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

// The path to the OIDC proxy route
export const OIDCProxyRoutePath = '/oidcProxy';

// The query parameter name for the target URL
export const targetURLParam = 'targetUrl';

const isValidUrl = (urlString: string) => {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    return false;
  }
};

export const getTargetUrlWithQueryParams = (req: any) => {
  const targetUrl = req.query[targetURLParam];

  // Get all query parameters except the targetURLParam
  const queryParams = {...req.query};
  delete queryParams[targetURLParam];

  // Check if the target URL has the shouldBeRedirectedByProxy query parameter
  const redirectParamName = 'shouldBeRedirectedByProxy';
  const shouldBeRedirected = req.query[redirectParamName];
  delete queryParams[redirectParamName];

  // Append the query parameters to the target URL
  const targetUrlWithQueryParams = new URL(targetUrl);

  Object.keys(queryParams).forEach(key => {
    targetUrlWithQueryParams.searchParams.append(key, queryParams[key] as string);
  });

  return {
    isValidUrl: isValidUrl(targetUrl),
    targetUrlWithQueryParams,
    shouldBeRedirected: typeof shouldBeRedirected === 'string' && shouldBeRedirected === 'true',
  };
};
