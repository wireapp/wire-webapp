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

import {includesString} from 'Util/StringUtil';

export const appendParameter = (url: string, parameter: string) => {
  const separator = includesString(url, '?') ? '&' : '?';
  return `${url}${separator}${parameter}`;
};

export const getParameter = (parameterName: string, locationSearch = window.location.search) => {
  const searchParameters = locationSearch.substring(1).split('&');
  for (const searchParam of searchParameters) {
    const [parameter, value] = searchParam.split('=');
    const isExpectedParameter = parameter === parameterName;
    if (isExpectedParameter) {
      if (value) {
        const decodedValue = decodeURI(value);

        if (decodedValue === 'false') {
          return false;
        }

        if (decodedValue === 'true') {
          return true;
        }

        return value;
      }

      return true;
    }
  }

  return null;
};

export const forwardParameter = (url: string, parameterName: string, locationSearch = window.location.search) => {
  const parameterValue = getParameter(parameterName, locationSearch);
  const hasValue = parameterValue != null;
  return hasValue ? appendParameter(url, `${parameterName}=${parameterValue}`) : url;
};

/**
 * Removes protocol, www and trailing slashes in the given url
 * @param url URL to be cleaned
 * @returns Plain URL
 */
export const getDomainName = (url = '') => {
  // force a protocol if there is none
  url = url.replace(/^(?!https?:\/\/)/i, 'http://');
  try {
    const {hostname, pathname, search, hash} = new URL(url);
    return hostname.replace(/^www./, '') + pathname.replace(/\/$/, '') + search + hash;
  } catch (error) {
    return '';
  }
};

export const getLinksFromHtml = <T extends HTMLElement>(html: string): T[] => {
  if (!html) {
    return [];
  }

  const anchorTags = new RegExp(/<a[\s]+([^>]+)>((?:.(?!\<\/a\>))*.)<\/a>/, 'g');
  const links = html.match(anchorTags);

  const hasLinks = links?.length;
  return hasLinks ? links.map(element => $<T>(element)[0]) : [];
};

/**
 * Prepends "http" to given URL if protocol is missing
 * @param url URL to be prepended
 * @returns prepended URL
 */
export const prependProtocol = (url: string) => (!url.match(/^http[s]?:\/\//i) ? `http://${url}` : url);
