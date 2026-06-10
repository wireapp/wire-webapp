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

export function pathWithParams(
  path: string,
  additionalParams?: Record<string, any>,
  whitelistParams?: string[],
  search = window.location.search,
): string {
  const params: Record<string, any> = paramsToRecord(search);

  if (additionalParams) {
    Object.assign(params, additionalParams);
  }

  if (whitelistParams) {
    Object.keys(params).forEach(key => {
      if (!whitelistParams.includes(key)) {
        delete params[key];
      }
    });
  }
  const queryString = new URLSearchParams(params).toString();
  return `${path}${queryString ? `?${queryString}` : ''}`;
}

export function paramsToRecord(params: string): Record<string, any> {
  const records: Record<string, any> = {};
  new URLSearchParams(params).forEach((value, key) => {
    records[key] = value;
  });
  return records;
}
/**
 * Looks for a given parameter by name in the query part of the URL of the current window's location.
 * @param parameterName the name of the parameter to search for
 * @param search the source to look at for the parameter, defaults to window.location.search
 * @returns the first found parameter or an empty string
 */
export function getURLParameter(parameterName: string, search = window.location.search): string {
  return new URLSearchParams(search).get(parameterName) || '';
}

/**
 * Looks for a given parameter by name in the hash part of the URL of the current window's location.
 * @param parameterName the name of the parameter to search for
 * @param hash the source to look for at the parameter, defaults to window.location.hash
 * @returns the first found parameter or an empty string
 */
export function getURLParameterFromHash(parameterName: string, hash = window.location.hash): string {
  // window.location.hash always starts with #
  if (hash.length <= 1 || hash[0] !== '#') {
    return '';
  }
  return new URLSearchParams(hash.substring(1)).get(parameterName) || '';
}

/**
 * Looks for a given parameter by name in the hash and query part of the URL of the current window's location.
 * Findings in the hash part are preferend ver the query part.
 * Empty values are considered a valid value.
 * @param parameterName the name of the parameter to search for
 * @param hash the "hash" source to look for at the parameter, defaults to window.location.hash
 * @param search the "search" source to look at for the parameter, defaults to window.location.search
 * @returns the first found parameter or an empty string
 */
export function getURLParameterFromAny(
  parameterName: string,
  hash = window.location.hash,
  search = window.location.search,
): string {
  // getURLParameterFromHash cannot be used here, as it will always return an empty string, even if the value is not set.
  // a decision whether the value was set or not is then no longer possible.

  // window.location.hash always starts with #
  if (hash.length > 1 && hash[0] === '#') {
    const result = new URLSearchParams(hash.substring(1)).get(parameterName);
    if (result !== null) {
      return result;
    }
  }
  return getURLParameter(parameterName, search);
}

export function hasURLParameter(parameterName: string, search = window.location.search): boolean {
  return !!new URLSearchParams(search).has(parameterName);
}
