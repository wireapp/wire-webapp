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

import {t, Declension} from 'utils/LocalizerUtil';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.SanitizationUtil = (() => {
  const _getSelfName = (declension = Declension.NOMINATIVE, bypassSanitization = false) => {
    const selfNameDeclensions = {
      [Declension.NOMINATIVE]: t('conversationYouNominative'),
      [Declension.DATIVE]: t('conversationYouDative'),
      [Declension.ACCUSATIVE]: t('conversationYouAccusative'),
    };

    const selfName = selfNameDeclensions[declension];
    return bypassSanitization ? selfName : z.util.SanitizationUtil.escapeString(selfName);
  };

  return {
    escapeRegex: string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),

    escapeString: string => _.escape(string),

    getFirstName: (userEntity, declension, bypassSanitization = false) => {
      if (userEntity.is_me) {
        return _getSelfName(declension, bypassSanitization);
      }
      return bypassSanitization
        ? userEntity.first_name()
        : z.util.SanitizationUtil.escapeString(userEntity.first_name());
    },

    getSelfName: _getSelfName,

    safeMailtoOpen: (event, email) => {
      event.preventDefault();
      event.stopPropagation();

      if (!z.util.isValidEmail(email)) {
        return;
      }

      const newWindow = window.open(`mailto:${email}`);
      if (newWindow) {
        window.setTimeout(() => newWindow.close(), 10);
      }
    },

    /**
     * Opens a new browser tab (target="_blank") with a given URL in a safe environment.
     * @see https://mathiasbynens.github.io/rel-noopener/
     * @param {string} url - URL you want to open in a new browser tab
     * @param {boolean} focus - True, if the new windows should get browser focus
     * @returns {Object} New window handle
     */
    safeWindowOpen: (url, focus = true) => {
      const newWindow = window.open(z.util.URLUtil.prependProtocol(url));

      if (newWindow) {
        newWindow.opener = null;
        if (focus) {
          newWindow.focus();
        }
      }

      return newWindow;
    },
  };
})();

export default z.util.SanitizationUtil;
