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

export function getURLParameter(parameterName: string, search = window.location.search): string {
  return new URLSearchParams(search).get(parameterName) || '';
}

export function hasURLParameter(parameterName: string, search = window.location.search): boolean {
  return !!new URLSearchParams(search).has(parameterName);
}
