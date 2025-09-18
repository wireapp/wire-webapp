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

import cs from 'I18n/cs-CZ.json';
import da from 'I18n/da-DK.json';
import de from 'I18n/de-DE.json';
import el from 'I18n/el-GR.json';
import en from 'I18n/en-US.json';
import es from 'I18n/es-ES.json';
import et from 'I18n/et-EE.json';
import fi from 'I18n/fi-FI.json';
import fr from 'I18n/fr-FR.json';
import hr from 'I18n/hr-HR.json';
import hu from 'I18n/hu-HU.json';
import it from 'I18n/it-IT.json';
import lt from 'I18n/lt-LT.json';
import nl from 'I18n/nl-NL.json';
import pl from 'I18n/pl-PL.json';
import pt from 'I18n/pt-BR.json';
import ro from 'I18n/ro-RO.json';
import ru from 'I18n/ru-RU.json';
import si from 'I18n/si-LK.json';
import sk from 'I18n/sk-SK.json';
import sl from 'I18n/sl-SI.json';
import tr from 'I18n/tr-TR.json';
import uk from 'I18n/uk-UA.json';
import {StorageKey} from 'Repositories/storage/StorageKey';
import {DEFAULT_LOCALE, setLocale, setStrings} from 'Util/LocalizerUtil';
import {loadValue, storeValue} from 'Util/StorageUtil';
import {setDateLocale, LocaleType} from 'Util/TimeUtil';
import {getParameter} from 'Util/UrlUtil';

import {URLParameter} from '../auth/URLParameter';

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
  si,
  sk,
  sl,
  tr,
  uk,
};

setStrings(strings);

export function setAppLocale() {
  const queryParam = getParameter(URLParameter.LOCALE);
  const currentBrowserLocale = navigator.language.slice(0, 2) as LocaleType;

  if (queryParam) {
    storeValue(StorageKey.LOCALIZATION.LOCALE, queryParam);
  }

  const storedLocale = loadValue<LocaleType>(StorageKey.LOCALIZATION.LOCALE);
  const locale: LocaleType = storedLocale || currentBrowserLocale || (DEFAULT_LOCALE as LocaleType);
  setLocale(locale);
  setDateLocale(locale);

  document.getElementsByTagName('html')[0].setAttribute('lang', locale);
}
