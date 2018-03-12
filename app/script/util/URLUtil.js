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

  const _get_domain = url_type => {
    const is_production = _is_production_backend();

    switch (url_type) {
      case TYPE.ACCOUNT:
        return is_production ? z.config.URL.ACCOUNT.PRODUCTION : z.config.URL.ACCOUNT.STAGING;
      case TYPE.SUPPORT:
        return z.config.URL.SUPPORT;
      case TYPE.TEAM_SETTINGS:
        return is_production ? z.config.URL.TEAM_SETTINGS.PRODUCTION : z.config.URL.TEAM_SETTINGS.STAGING;
      case TYPE.WEBAPP:
        return is_production ? z.config.URL.WEBAPP.PRODUCTION : z.config.URL.WEBAPP.STAGING;
      case TYPE.WEBSITE:
        return is_production ? z.config.URL.WEBSITE.PRODUCTION : z.config.URL.WEBSITE.STAGING;
      default:
        throw new Error('Unknown URL type');
    }
  };

  const _is_production_backend = () => z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION;

  const _build_support_url = support_id => {
    const url_path = _.isNumber(support_id) ? z.string.urlSupportArticles : z.string.urlSupportRequests;
    return `${_get_domain(TYPE.SUPPORT)}${z.l10n.text(url_path)}${support_id}`;
  };

  const _build_url = (type, path = '') => `${_get_domain(type)}${path && path.startsWith('/') ? path : ''}`;

  const _get_links_from_html = html => {
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
    build_support_url: _build_support_url,
    build_url: _build_url,
    get_links_from_html: _get_links_from_html,
  };
})();
