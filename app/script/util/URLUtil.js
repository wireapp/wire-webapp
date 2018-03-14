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

  const _getDomain = urlType => {
    const isProduction = _isProductionBackend();

    switch (urlType) {
      case TYPE.ACCOUNT:
        return isProduction ? z.config.URL.ACCOUNT.PRODUCTION : z.config.URL.ACCOUNT.STAGING;
      case TYPE.SUPPORT:
        return z.config.URL.SUPPORT;
      case TYPE.TEAM_SETTINGS:
        return isProduction ? z.config.URL.TEAM_SETTINGS.PRODUCTION : z.config.URL.TEAM_SETTINGS.STAGING;
      case TYPE.WEBAPP:
        return isProduction ? z.config.URL.WEBAPP.PRODUCTION : z.config.URL.WEBAPP.STAGING;
      case TYPE.WEBSITE:
        return isProduction ? z.config.URL.WEBSITE.PRODUCTION : z.config.URL.WEBSITE.STAGING;
      default:
        throw new Error('Unknown URL type');
    }
  };

  const _isProductionBackend = () => z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION;

  const _buildSupportUrl = support_id => {
    const urlPath = _.isNumber(support_id) ? z.string.urlSupportArticles : z.string.urlSupportRequests;
    return `${_getDomain(TYPE.SUPPORT)}${z.l10n.text(urlPath)}${support_id}`;
  };

  const _buildUrl = (type, path = '') => `${_getDomain(type)}${path && path.startsWith('/') ? path : ''}`;

  const _getLinksFromHtml = html => {
    if (!html) {
      return [];
    }

    const anchorTags = new RegExp(/<a[\s]+([^>]+)>((?:.(?!\<\/a\>))*.)<\/a>/, 'g');
    const links = html.match(anchorTags);

    if (links && links.length) {
      return links.map(element => $(element)[0]);
    }

    return [];
  };

  return {
    TYPE: TYPE,
    buildSupportUrl: _buildSupportUrl,
    buildUrl: _buildUrl,
    getLinksFromHtml: _getLinksFromHtml,
  };
})();
