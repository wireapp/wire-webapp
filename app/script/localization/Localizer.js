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
/* eslint-disable no-unused-vars */
import cs from 'moment/locale/cs.js';
import da from 'moment/locale/da.js';
import de from 'moment/locale/de.js';
import el from 'moment/locale/el.js';
import es from 'moment/locale/es.js';
import et from 'moment/locale/et.js';
import fi from 'moment/locale/fi.js';
import fr from 'moment/locale/fr.js';
import hr from 'moment/locale/hr.js';
import hu from 'moment/locale/hu.js';
import it from 'moment/locale/it.js';
import lt from 'moment/locale/lt.js';
import nl from 'moment/locale/nl.js';
import pl from 'moment/locale/pl.js';
import pt from 'moment/locale/pt.js';
import ro from 'moment/locale/ro.js';
import ru from 'moment/locale/ru.js';
import sk from 'moment/locale/sk.js';
import sl from 'moment/locale/sl.js';
import tr from 'moment/locale/tr.js';
import uk from 'moment/locale/uk.js';

import initGlobal from '../localization/strings-init.js';
import webappGlobal from '../localization/webapp.js';
import csGlobal from '../localization/translations/webapp-cs.js';
import daGlobal from '../localization/translations/webapp-da.js';
import deGlobal from '../localization/translations/webapp-de.js';
import elGlobal from '../localization/translations/webapp-el.js';
import esGlobal from '../localization/translations/webapp-es.js';
import etGlobal from '../localization/translations/webapp-et.js';
import fiGlobal from '../localization/translations/webapp-fi.js';
import frGlobal from '../localization/translations/webapp-fr.js';
import hrGlobal from '../localization/translations/webapp-hr.js';
import huGlobal from '../localization/translations/webapp-hu.js';
import itGlobal from '../localization/translations/webapp-it.js';
import ltGlobal from '../localization/translations/webapp-lt.js';
import nlGlobal from '../localization/translations/webapp-nl.js';
import plGlobal from '../localization/translations/webapp-pl.js';
import ptGlobal from '../localization/translations/webapp-pt.js';
import roGlobal from '../localization/translations/webapp-ro.js';
import ruGlobal from '../localization/translations/webapp-ru.js';
import skGlobal from '../localization/translations/webapp-sk.js';
import slGlobal from '../localization/translations/webapp-sl.js';
import trGlobal from '../localization/translations/webapp-tr.js';
import ukGlobal from '../localization/translations/webapp-uk.js';
/* eslint-enable no-unused-vars */

window.z = window.z || {};

(function setAppLocale() {
  const DEFAULT_LOCALE = 'en';
  const queryParam = z.util.URLUtil.getParameter(z.auth.URLParameter.LOCALE);
  const currentBrowserLocale = navigator.language.substr(0, 2);
  let storedLocale = z.util.StorageUtil.getValue(z.storage.StorageKey.LOCALIZATION.LOCALE);

  if (queryParam) {
    storedLocale = z.util.StorageUtil.setValue(z.storage.StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const locale = storedLocale || currentBrowserLocale || DEFAULT_LOCALE;

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);

  moment.locale([locale, DEFAULT_LOCALE]);

  if (z.string[locale]) {
    Object.assign(z.string, z.string[locale]);
  }
})();

z.l10n = (() => {
  const isStringOrNumber = toTest => _.isString(toTest) || _.isNumber(toTest);

  const replaceSubstitute = (string, regex, substitute) => {
    const replacement = isStringOrNumber(substitute)
      ? substitute
      : (found, content) => (substitute.hasOwnProperty(content) ? substitute[content] : found);
    return string.replace(regex, replacement);
  };

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

      string = z.util.SanitizationUtil.escapeString(string);

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

export default z.l10n;
