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

export function pathWithParams(
  path: string,
  additionalParams?: string,
  whitelistParams: string[] = FORWARDED_QUERY_KEYS
): string {
  const searchParams = window.location.search
    .replace(/^\?/, '')
    .split('&')
    .filter(searchParam => !!searchParam)
    .filter(searchParam => {
      const paramName = searchParam.split('=')[0];
      return whitelistParams.includes(paramName);
    });

  if (additionalParams) {
    searchParams.push(additionalParams);
  }
  const joinedParams = searchParams.join('&');
  return `${path}${joinedParams.length ? `?${joinedParams}` : ''}`;
}

export function getURLParameter(parameterName: string): string {
  return (window.location.search.split(`${parameterName}=`)[1] || '').split('&')[0];
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
