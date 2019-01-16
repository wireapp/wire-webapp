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

import ko from 'knockout';
import moment from 'moment';

import * as StorageUtil from 'utils/StorageUtil';
import SanitizationUtil from 'utils/SanitizationUtil';
import URLUtil from 'utils/URLUtil';
import URLParameter from '../auth/URLParameter';
import StorageKey from '../storage/StorageKey';

/* eslint-disable no-unused-vars */
import moment_cs from 'moment/locale/cs.js';
import moment_da from 'moment/locale/da.js';
import moment_de from 'moment/locale/de.js';
import moment_el from 'moment/locale/el.js';
import moment_es from 'moment/locale/es.js';
import moment_et from 'moment/locale/et.js';
import moment_fi from 'moment/locale/fi.js';
import moment_fr from 'moment/locale/fr.js';
import moment_hr from 'moment/locale/hr.js';
import moment_hu from 'moment/locale/hu.js';
import moment_it from 'moment/locale/it.js';
import moment_lt from 'moment/locale/lt.js';
import moment_nl from 'moment/locale/nl.js';
import moment_pl from 'moment/locale/pl.js';
import moment_pt from 'moment/locale/pt.js';
import moment_ro from 'moment/locale/ro.js';
import moment_ru from 'moment/locale/ru.js';
import moment_sk from 'moment/locale/sk.js';
import moment_sl from 'moment/locale/sl.js';
import moment_tr from 'moment/locale/tr.js';
import moment_uk from 'moment/locale/uk.js';
/* eslint-enable no-unused-vars */

import cs from 'resource/translation/cs.json';
import da from 'resource/translation/da.json';
import de from 'resource/translation/de.json';
import el from 'resource/translation/el.json';
import en from 'resource/translation/en.json';
import es from 'resource/translation/es.json';
import et from 'resource/translation/et.json';
import fi from 'resource/translation/fi.json';
import fr from 'resource/translation/fr.json';
import hr from 'resource/translation/hr.json';
import hu from 'resource/translation/hu.json';
import it from 'resource/translation/it.json';
import lt from 'resource/translation/lt.json';
import nl from 'resource/translation/nl.json';
import pl from 'resource/translation/pl.json';
import pt from 'resource/translation/pt.json';
import ro from 'resource/translation/ro.json';
import ru from 'resource/translation/ru.json';
import sk from 'resource/translation/sk.json';
import sl from 'resource/translation/sl.json';
import tr from 'resource/translation/tr.json';
import uk from 'resource/translation/uk.json';

window.z = window.z || {};

window.z.string = {
  cs,
  da,
  de,
  el,
  en,
  es,
  et,
  fi,
  fr,
  hr,
  hu,
  it,
  lt,
  nl,
  pl,
  pt,
  ro,
  ru,
  sk,
  sl,
  tr,
  uk,
};

window.z.string.Declension = {
  ACCUSATIVE: 'accusative',
  DATIVE: 'dative',
  NOMINATIVE: 'nominative',
};

(function setAppLocale() {
  const DEFAULT_LOCALE = 'en';
  const queryParam = URLUtil.getParameter(URLParameter.LOCALE);
  const currentBrowserLocale = navigator.language.substr(0, 2);
  let storedLocale = StorageUtil.getValue(StorageKey.LOCALIZATION.LOCALE);

  if (queryParam) {
    storedLocale = StorageUtil.setValue(StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const locale = storedLocale || currentBrowserLocale || DEFAULT_LOCALE;

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);

  moment.locale([locale, DEFAULT_LOCALE]);

  if (z.string[locale]) {
    Object.assign(z.string, z.string[DEFAULT_LOCALE], z.string[locale]);
  }
})();

const isStringOrNumber = toTest => _.isString(toTest) || _.isNumber(toTest);

const replaceSubstitute = (string, regex, substitute) => {
  const replacement = isStringOrNumber(substitute)
    ? substitute
    : (found, content) => (substitute.hasOwnProperty(content) ? substitute[content] : found);
  return string.replace(regex, replacement);
};

z.l10n = (() => {
  return {
    safeHtml(value, substitutions = {}) {
      const replace = isStringOrNumber(substitutions) ? substitutions : substitutions.replace;

      const defaultReplacements = {
        '/bold': '</b>',
        '/italic': '</i>',
        bold: '<b>',
        italic: '<i>',
      };

      const replaceDangerously = Object.assign({}, defaultReplacements, substitutions.replaceDangerously);

      let string = ko.unwrap(value);

      if (replace !== undefined) {
        string = replaceSubstitute(string, /{{(.+?)}}/g, replace);
      }

      string = SanitizationUtil.escapeString(string);

      string = replaceSubstitute(string, /\[(.+?)\]/g, replaceDangerously);

      return string;
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
     * z.l10.text('{{greeting}} {{name}}', {name: 'Tod', greeting: 'Hey'}) // returns 'Hey Tod'
     *
     * @param {Observable|string} value - localized string in our case usually z.string.foo
     * @param {string|Object} [substitute] - data to fill all the placeholder with
     * @returns {string} - string with substituted placeholders
     */
    text: (value, substitute) => replaceSubstitute(ko.unwrap(value), /{{(.+?)}}/g, substitute),
  };
})();

export function t(identifier, substitutions, dangerousSubstitutions) {
  const value = z.string[identifier];
  const replaceDangerously = Object.assign(
    {
      '/bold': '</b>',
      '/italic': '</i>',
      bold: '<b>',
      italic: '<i>',
    },
    dangerousSubstitutions
  );

  const substituted = replaceSubstitute(value, /{{(.+?)}}/g, substitutions);
  const escaped = SanitizationUtil.escapeString(substituted);
  const dangerouslySubstituted = replaceSubstitute(escaped, /\[(.+?)\]/g, replaceDangerously);

  return dangerouslySubstituted;
}

window.t = t;

export default z.l10n;
