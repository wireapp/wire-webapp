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

import {loadValue, storeValue} from '../util/StorageUtil';
import {getParameter} from '../util/UrlUtil';
import {DEFAULT_LOCALE, setLocale, setStrings} from '../util/LocalizerUtil';
import {setDateLocale, LocaleType} from '../util/TimeUtil';
import {URLParameter} from '../auth/URLParameter';
import {StorageKey} from '../storage/StorageKey';
import cs from '../../i18n/cs-CZ.json';
import da from '../../i18n/da-DK.json';
import de from '../../i18n/de-DE.json';
import el from '../../i18n/el-GR.json';
import en from '../../i18n/en-US.json';
import es from '../../i18n/es-ES.json';
import et from '../../i18n/et-EE.json';
import fi from '../../i18n/fi-FI.json';
import fr from '../../i18n/fr-FR.json';
import hr from '../../i18n/hr-HR.json';
import hu from '../../i18n/hu-HU.json';
import it from '../../i18n/it-IT.json';
import lt from '../../i18n/lt-LT.json';
import nl from '../../i18n/nl-NL.json';
import pl from '../../i18n/pl-PL.json';
import pt from '../../i18n/pt-BR.json';
import ro from '../../i18n/ro-RO.json';
import ru from '../../i18n/ru-RU.json';
import sk from '../../i18n/sk-SK.json';
import sl from '../../i18n/sl-SI.json';
import tr from '../../i18n/tr-TR.json';
import uk from '../../i18n/uk-UA.json';

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
  const currentBrowserLocale = navigator.language.substr(0, 2) as LocaleType;

  if (queryParam) {
    storeValue(StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const storedLocale = loadValue<LocaleType>(StorageKey.LOCALIZATION.LOCALE);
  const locale: LocaleType = storedLocale || currentBrowserLocale || (DEFAULT_LOCALE as LocaleType);
  setLocale(locale);
  setDateLocale(locale);

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);

  if (window.z.string[locale]) {
    window.z.string = {...window.z.string, ...window.z.string[DEFAULT_LOCALE], ...window.z.string[locale]};
  }
})();
