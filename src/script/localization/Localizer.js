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

import {loadValue, storeValue} from 'Util/StorageUtil';
import {getParameter} from 'Util/UrlUtil';
import {DEFAULT_LOCALE, setLocale, setStrings} from 'Util/LocalizerUtil';
import {setDateLocale} from 'Util/TimeUtil';

import {URLParameter} from '../auth/URLParameter';
import {StorageKey} from '../storage/StorageKey';

import cs from 'Resource/translation/cs-CZ.json';
import da from 'Resource/translation/da-DK.json';
import de from 'Resource/translation/de-DE.json';
import el from 'Resource/translation/el-GR.json';
import en from 'Resource/translation/en-US.json';
import es from 'Resource/translation/es-ES.json';
import et from 'Resource/translation/et-EE.json';
import fi from 'Resource/translation/fi-FI.json';
import fr from 'Resource/translation/fr-FR.json';
import hr from 'Resource/translation/hr-HR.json';
import hu from 'Resource/translation/hu-HU.json';
import it from 'Resource/translation/it-IT.json';
import lt from 'Resource/translation/lt-LT.json';
import nl from 'Resource/translation/nl-NL.json';
import pl from 'Resource/translation/pl-PL.json';
import pt from 'Resource/translation/pt-BR.json';
import ro from 'Resource/translation/ro-RO.json';
import ru from 'Resource/translation/ru-RU.json';
import sk from 'Resource/translation/sk-SK.json';
import sl from 'Resource/translation/sl-SI.json';
import tr from 'Resource/translation/tr-TR.json';
import uk from 'Resource/translation/uk-UA.json';

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
  const queryParam = getParameter(URLParameter.LOCALE);
  const currentBrowserLocale = navigator.language.substr(0, 2);
  let storedLocale = loadValue(StorageKey.LOCALIZATION.LOCALE);

  if (queryParam) {
    storedLocale = storeValue(StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const locale = storedLocale || currentBrowserLocale || DEFAULT_LOCALE;
  setLocale(locale);
  setDateLocale(locale);

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);

  if (window.z.string[locale]) {
    window.z.string = {...window.z.string, ...window.z.string[DEFAULT_LOCALE], ...window.z.string[locale]};
  }
})();
