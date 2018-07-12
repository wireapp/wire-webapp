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
z.localization = z.localization || {};

class Localizer {
  constructor() {
    const DEFAULT_LOCALE = 'en';
    const queryParam = z.util.URLUtil.getParameter(z.auth.URLParameter.LOCALE);
    const currentBrowserLocale = navigator.language.substr(0, 2);
    let storedLocale = z.util.StorageUtil.getValue(z.storage.StorageKey.LOCALIZATION.LOCALE);

    if (queryParam) {
      storedLocale = z.util.StorageUtil.setValue(z.storage.StorageKey.LOCALIZATION.LOCALE, queryParam);
    }

    this.locale = storedLocale || currentBrowserLocale || DEFAULT_LOCALE;

    document.getElementsByTagName('html')[0].setAttribute('lang', this.locale);

    moment.locale([this.locale, DEFAULT_LOCALE]);

    if (z.string[this.locale]) {
      Object.assign(z.string, z.string[this.locale]);
    }
  }
}

z.localization.Localizer = new Localizer();

z.l10n = (() => {
  const replaceTags = (string, tagSubstitutes) => {
    Object.entries(tagSubstitutes).forEach(([identifier, substitute]) => {
      string = string.replace(new RegExp(`\\[${identifier}\\]`, 'g'), substitute);
    });

    return string;
  };

  const replaceWithArray = (string, substitutions) => {
    substitutions.forEach(([identifier, substitute]) => {
      string = string.replace(new RegExp(`{{${identifier}}}`, 'g'), substitute);
    });

    return string;
  };

  const replaceWithObject = (string, substitutions) => replaceWithArray(string, Object.entries(substitutions));

  const replaceWithString = (string, substitute) => string.replace(/{{\w+}}/, substitute);

  return {
    safeHtml(value, substitutions = {}) {
      let string = z.util.SanitizationUtil.escapeString(ko.unwrap(value));

      if (_.isString(substitutions)) {
        const escapedSubstitute = z.util.SanitizationUtil.escapeString(substitutions);
        string = replaceWithString(string, escapedSubstitute);
      }

      if (substitutions.replace) {
        const escapedSubstitutes = Object.entries(substitutions.replace).map(([identifier, unescapedSubstitute]) => {
          return [identifier, z.util.SanitizationUtil.escapeString(unescapedSubstitute)];
        });
        string = replaceWithArray(string, escapedSubstitutes);
      }

      const defaultReplacements = {
        '\\/bold': '</b>',
        '\\/italic': '</i>',
        bold: '<b>',
        italic: '<i>',
      };
      const replaceDangerously = Object.assign({}, defaultReplacements, substitutions.replaceDangerously);

      return replaceTags(string, replaceDangerously);
    },

    /**
     * Retrieve localized string and replace placeholders
     *
     * This method give you two options to replace placeholders
     *
     * @example using a string as substitute
     * z.l10.text('Hey {{name}}', 'Tod') // returns 'Hey Tod'
     *
     * @example using an object as substitute
     * z.l10.text('{{greeting}} {{name}}', {name: 'Tod', greeting: 'Hey') // returns 'Hey Tod'
     *
     * @param {Observable|string} value - localized string in our case usually z.string.foo
     * @param {string|Object} [substitute] - data to fill all the placeholder with
     * @returns {string} - string with substituted placeholders
     */
    text(value, substitute) {
      const string = z.util.SanitizationUtil.escapeString(ko.unwrap(value));

      if (_.isObject(substitute)) {
        return replaceWithObject(string, substitute);
      }

      return _.isString(value) ? replaceWithString(string, substitute) : string;
    },
  };
})();
