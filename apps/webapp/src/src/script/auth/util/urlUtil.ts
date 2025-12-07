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

import {FORWARDED_QUERY_KEYS} from '../route';

export function getSearchParams(
  additionalParams: {[query: string]: string} = {},
  whitelistParams: string[] = FORWARDED_QUERY_KEYS,
): string {
  const searchParams = window.location.search
    .replace(/^\?/, '')
    .split('&')
    .filter(searchParam => !!searchParam)
    .filter(searchParam => {
      const paramName = searchParam.split('=')[0];
      return whitelistParams.includes(paramName);
    });
  Object.entries(additionalParams).forEach(([query, value]) => {
    searchParams.push(`${query}=${value}`);
  });

  return searchParams.join('&');
}

export function pathWithParams(
  path: string,
  additionalParams?: {[query: string]: string},
  whitelistParams: string[] = FORWARDED_QUERY_KEYS,
): string {
  const params = getSearchParams(additionalParams, whitelistParams);
  return `${path}${params.length ? `?${params}` : ''}`;
}

export function hasURLParameter(parameterName: string): boolean {
  return window.location.search
    .split(/\?|&/)
    .map(parameter => parameter.split('=')[0])
    .includes(parameterName);
}

export function openTab(url: string): Window {
  const newWindow = window.open(url);
  if (newWindow) {
    newWindow.opener = null;
  }
  return newWindow;
}

export const SSO_CODE_PREFIX = 'wire-';

export function getPrefixedSSOCode(code?: string) {
  return code ? `${SSO_CODE_PREFIX}${code}` : '';
}

export const navigateTo = (url: string) => {
  window.location.assign(url);
};
