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

import moment from 'moment';

import * as StorageUtil from 'utils/StorageUtil';
import URLUtil from 'utils/URLUtil';
import URLParameter from '../auth/URLParameter';
import StorageKey from '../storage/StorageKey';

import {DEFAULT_LOCALE, setLocale, setStrings} from 'utils/LocalizerUtil';

import 'moment/locale/cs.js';
import 'moment/locale/da.js';
import 'moment/locale/de.js';
import 'moment/locale/el.js';
import 'moment/locale/es.js';
import 'moment/locale/et.js';
import 'moment/locale/fi.js';
import 'moment/locale/fr.js';
import 'moment/locale/hr.js';
import 'moment/locale/hu.js';
import 'moment/locale/it.js';
import 'moment/locale/lt.js';
import 'moment/locale/nl.js';
import 'moment/locale/pl.js';
import 'moment/locale/pt.js';
import 'moment/locale/ro.js';
import 'moment/locale/ru.js';
import 'moment/locale/sk.js';
import 'moment/locale/sl.js';
import 'moment/locale/tr.js';
import 'moment/locale/uk.js';

import cs from 'resource/translation/cs-CZ.json';
import da from 'resource/translation/da-DK.json';
import de from 'resource/translation/de-DE.json';
import el from 'resource/translation/el-GR.json';
import en from 'resource/translation/en-US.json';
import es from 'resource/translation/es-ES.json';
import et from 'resource/translation/et-EE.json';
import fi from 'resource/translation/fi-FI.json';
import fr from 'resource/translation/fr-FR.json';
import hr from 'resource/translation/hr-HR.json';
import hu from 'resource/translation/hu-HU.json';
import it from 'resource/translation/it-IT.json';
import lt from 'resource/translation/lt-LT.json';
import nl from 'resource/translation/nl-NL.json';
import pl from 'resource/translation/pl-PL.json';
import pt from 'resource/translation/pt-BR.json';
import ro from 'resource/translation/ro-RO.json';
import ru from 'resource/translation/ru-RU.json';
import sk from 'resource/translation/sk-SK.json';
import sl from 'resource/translation/sl-SI.json';
import tr from 'resource/translation/tr-TR.json';
import uk from 'resource/translation/uk-UA.json';

window.z = window.z || {};

const strings = {
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

window.z.string = strings;
setStrings(strings);

(function setAppLocale() {
  const queryParam = URLUtil.getParameter(URLParameter.LOCALE);
  const currentBrowserLocale = navigator.language.substr(0, 2);
  let storedLocale = StorageUtil.getValue(StorageKey.LOCALIZATION.LOCALE);

  if (queryParam) {
    storedLocale = StorageUtil.setValue(StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const locale = storedLocale || currentBrowserLocale || DEFAULT_LOCALE;
  setLocale(locale);

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);

  moment.locale([locale, DEFAULT_LOCALE]);

  if (z.string[locale]) {
    Object.assign(z.string, z.string[DEFAULT_LOCALE], z.string[locale]);
  }
})();
