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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.URLUtil = (() => {
  const TYPE = {
    ACCOUNT: 'TYPE.ACCOUNT',
    SUPPORT: 'TYPE.SUPPORT',
    TEAM_SETTINGS: 'TYPE.TEAM_SETTINGS',
    WEBAPP: 'TYPE.WEBAPP',
    WEBSITE: 'TYPE.WEBSITE',
  };

  const _appendParameter = (url, parameter) => {
    const separator = z.util.StringUtil.includes(url, '?') ? '&' : '?';
    return `${url}${separator}${parameter}`;
  };

  const _buildSupportUrl = support_id => {
    const urlPath = _.isNumber(support_id) ? z.string.urlSupportArticles : z.string.urlSupportRequests;
    return `${_getDomain(TYPE.SUPPORT)}${z.l10n.text(urlPath)}${support_id}`;
  };

  const _buildUrl = (type, path = '') => `${_getDomain(type)}${path && path.startsWith('/') ? path : ''}`;

  const _forwardParameter = (url, parameterName, locationSearch = window.location.search) => {
    const parameterValue = _getParameter(parameterName, locationSearch);
    const hasValue = parameterValue != null;
    return hasValue ? _appendParameter(url, `${parameterName}=${parameterValue}`) : url;
  };

  const _getDomain = urlType => {
    const isProduction = _isProductionBackend();

    switch (urlType) {
      case TYPE.ACCOUNT:
        return isProduction ? window.wire.env.URL.ACCOUNT_BASE : z.config.URL.ACCOUNT.STAGING;
      case TYPE.SUPPORT:
        return z.config.URL.SUPPORT;
      case TYPE.TEAM_SETTINGS:
        return isProduction ? window.wire.env.URL.TEAMS_BASE : z.config.URL.TEAM_SETTINGS.STAGING;
      case TYPE.WEBAPP:
        return isProduction ? window.wire.env.APP_BASE : z.config.URL.WEBAPP.STAGING;
      case TYPE.WEBSITE:
        return isProduction ? window.wire.env.URL.WEBSITE_BASE : z.config.URL.WEBSITE.STAGING;
      default:
        throw new Error('Unknown URL type');
    }
  };

  /**
   * Removes protocol, www and trailing slashes in the given url
   * @param {string} url - URL
   * @returns {string} Plain URL
   */
  const _getDomainName = (url = '') => {
    // force a protocol if there is none
    url = url.replace(/^(?!https?:\/\/)/i, 'http://');
    try {
      const {hostname, pathname, search, hash} = new URL(url);
      return hostname.replace(/^www./, '') + pathname.replace(/\/$/, '') + search + hash;
    } catch (error) {
      return '';
    }
  };

  const _getParameter = (parameterName, locationSearch = window.location.search) => {
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
  };

  const _getLinksFromHtml = html => {
    if (!html) {
      return [];
    }

    const anchorTags = new RegExp(/<a[\s]+([^>]+)>((?:.(?!\<\/a\>))*.)<\/a>/, 'g');
    const links = html.match(anchorTags);

    const hasLinks = links && links.length;
    return hasLinks ? links.map(element => $(element)[0]) : [];
  };

  const _isProductionBackend = () => z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION;

  /**
   * Prepends http to given url if protocol missing
   * @param {string} url - URL you want to open in a new browser tab
   * @returns {undefined} No return value
   */
  const _prependProtocol = url => (!url.match(/^http[s]?:\/\//i) ? `http://${url}` : url);

  return {
    TYPE: TYPE,
    appendParameter: _appendParameter,
    buildSupportUrl: _buildSupportUrl,
    buildUrl: _buildUrl,
    forwardParameter: _forwardParameter,
    getDomainName: _getDomainName,
    getLinksFromHtml: _getLinksFromHtml,
    getParameter: _getParameter,
    prependProtocol: _prependProtocol,
  };
})();
