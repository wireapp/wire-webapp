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

import LRUCache from '@wireapp/lru-cache';

window.z = window.z || {};
window.z.assets = z.assets || {};

z.assets.AssetURLCache = (() => {
  // FIXME
  const _lruCache = new LRUCache.LRUCache(100);

  const _getUrl = identifier => _lruCache.get(identifier);

  const _setUrl = (identifier, url) => {
    const isExistingUrl = _getUrl(identifier);

    if (isExistingUrl) {
      window.URL.revokeObjectURL(url);
      return isExistingUrl;
    }

    const outdatedUrl = _lruCache.set(identifier, url);

    if (outdatedUrl != null) {
      window.URL.revokeObjectURL(outdatedUrl);
    }

    return url;
  };

  return {
    getUrl: _getUrl,
    setUrl: _setUrl,
  };
})();
