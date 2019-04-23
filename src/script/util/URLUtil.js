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

import {t} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.util = z.util || {};

const URLUtil = {
  TYPE: {
    ACCOUNT: 'TYPE.ACCOUNT',
    SUPPORT: 'TYPE.SUPPORT',
    TEAM_SETTINGS: 'TYPE.TEAM_SETTINGS',
    WEBAPP: 'TYPE.WEBAPP',
    WEBSITE: 'TYPE.WEBSITE',
  },

  appendParameter: (url, parameter) => {
    const separator = z.util.StringUtil.includes(url, '?') ? '&' : '?';
    return `${url}${separator}${parameter}`;
  },

  buildSupportUrl: supportId => {
    return _.isNumber(supportId)
      ? `${window.wire.env.URL.SUPPORT_BASE}${t('urlSupportArticles')}${supportId}`
      : `${window.wire.env.URL.SUPPORT_BASE}${t('urlSupportRequests')}`;
  },

  forwardParameter: (url, parameterName, locationSearch = window.location.search) => {
    const parameterValue = URLUtil.getParameter(parameterName, locationSearch);
    const hasValue = parameterValue != null;
    return hasValue ? URLUtil.appendParameter(url, `${parameterName}=${parameterValue}`) : url;
  },

  /**
   * Removes protocol, www and trailing slashes in the given url
   * @param {string} url - URL
   * @returns {string} Plain URL
   */
  getDomainName: (url = '') => {
    // force a protocol if there is none
    url = url.replace(/^(?!https?:\/\/)/i, 'http://');
    try {
      const {hostname, pathname, search, hash} = new URL(url);
      return hostname.replace(/^www./, '') + pathname.replace(/\/$/, '') + search + hash;
    } catch (error) {
      return '';
    }
  },

  getLinksFromHtml: html => {
    if (!html) {
      return [];
    }

    const anchorTags = new RegExp(/<a[\s]+([^>]+)>((?:.(?!\<\/a\>))*.)<\/a>/, 'g');
    const links = html.match(anchorTags);

    const hasLinks = links && links.length;
    return hasLinks ? links.map(element => $(element)[0]) : [];
  },

  getParameter: (parameterName, locationSearch = window.location.search) => {
    const searchParameters = locationSearch.substring(1).split('&');
    for (const searchParam of searchParameters) {
      const [parameter, value] = searchParam.split('=');
      const isExpectedParameter = parameter === parameterName;
      if (isExpectedParameter) {
        if (value) {
          const decodedValue = window.decodeURI(value);

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
  },

  /**
   * Prepends http to given url if protocol missing
   * @param {string} url - URL you want to open in a new browser tab
   * @returns {undefined} No return value
   */
  prependProtocol: url => (!url.match(/^http[s]?:\/\//i) ? `http://${url}` : url),
};

z.util.URLUtil = URLUtil;

export {URLUtil};
