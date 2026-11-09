/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {isNonEmptyString, isNull} from '@sindresorhus/is';

import {FORWARDED_QUERY_KEYS} from '../route';

type ForwardedQueryParameterOptions = {
  readonly locationSearch: string;
  readonly additionalQueryParameters: Readonly<Record<string, string>>;
  readonly allowedQueryParameterNames: readonly string[];
};

type AuthRedirectPathOptions = ForwardedQueryParameterOptions & {
  readonly path: string;
};

function serializeForwardedQueryParameters(options: ForwardedQueryParameterOptions): string {
  const {locationSearch, additionalQueryParameters, allowedQueryParameterNames} = options;
  const forwardedQueryParameters = locationSearch
    .replace(/^\?/, '')
    .split('&')
    .filter(isNonEmptyString)
    .filter(queryParameter => {
      const [queryParameterName = ''] = queryParameter.split('=');

      return allowedQueryParameterNames.includes(queryParameterName);
    });
  const appendedQueryParameters = Object.entries(additionalQueryParameters).map(
    ([queryParameterName, queryParameterValue]) => {
      return `${queryParameterName}=${queryParameterValue}`;
    },
  );

  return [...forwardedQueryParameters, ...appendedQueryParameters].join('&');
}

export function createAuthRedirectPath(options: AuthRedirectPathOptions): string {
  const {path} = options;
  const serializedQueryParameters = serializeForwardedQueryParameters(options);

  return `${path}${isNonEmptyString(serializedQueryParameters) ? `?${serializedQueryParameters}` : ''}`;
}

export function getSearchParams(
  additionalParams: {[query: string]: string} = {},
  whitelistParams: string[] = FORWARDED_QUERY_KEYS,
): string {
  return serializeForwardedQueryParameters({
    locationSearch: window.location.search,
    additionalQueryParameters: additionalParams,
    allowedQueryParameterNames: whitelistParams,
  });
}

export function pathWithParams(
  path: string,
  additionalParams: {[query: string]: string} = {},
  whitelistParams: string[] = FORWARDED_QUERY_KEYS,
): string {
  return createAuthRedirectPath({
    path,
    locationSearch: window.location.search,
    additionalQueryParameters: additionalParams,
    allowedQueryParameterNames: whitelistParams,
  });
}

export function hasURLParameter(parameterName: string): boolean {
  return window.location.search
    .split(/\?|&/)
    .map(parameter => {
      return parameter.split('=')[0];
    })
    .includes(parameterName);
}

export function openTab(url: string): Window | null {
  const newWindow = window.open(url);
  if (!isNull(newWindow)) {
    newWindow.opener = null;
  }
  return newWindow;
}

export const SSO_CODE_PREFIX = 'wire-';

export function getPrefixedSSOCode(code?: string): string {
  return isNonEmptyString(code) ? `${SSO_CODE_PREFIX}${code}` : '';
}

export const navigateTo = (url: string): void => {
  window.location.assign(url);
};
