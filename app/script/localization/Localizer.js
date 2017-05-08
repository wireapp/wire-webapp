/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

z.l10n = (() => {
  const DEFAULT_LOCALE = 'en';
  const query_param = z.util.get_url_parameter(z.auth.URLParameter.LOCALE);
  const current_browser_locale =  navigator.language.substr(0, 2);
  let stored_locale = z.util.StorageUtil.get_value(z.storage.StorageKey.LOCALIZATION.LOCALE);

  if (query_param) {
    stored_locale = z.util.StorageUtil.set_value(z.storage.StorageKey.LOCALIZATION.LOCALE, query_param);
  }

  this.locale = stored_locale || current_browser_locale || DEFAULT_LOCALE;

  moment.locale([this.locale, DEFAULT_LOCALE]);

  if (z.string[this.locale]) {
    Object.assign(z.string, z.string[this.locale]);
  }

  return {

    /**
     *
     * @param string
     * @param substitutes
     */
    text(string, ...substitutes) {
      const string = ko.unwrap(string);
      return string.replace(/%\w+/, ...substitutes);
    },
  }
});

ko.bindingHandlers.l10n_href = {
  update(element, valueAccessor) {
    element.setAttribute('href', z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_input = {
  update(element, valueAccessor) {
    element.setAttribute('value', z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_placeholder = {
  update(element, valueAccessor) {
    element.setAttribute('placeholder', z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_text = {
  update(element, valueAccessor) {
    ko.utils.setTextContent(element, z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_html = {
  update(element, valueAccessor) {
    ko.utils.setHtml(element, z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_tooltip = {
  update(element, valueAccessor) {
    element.setAttribute('title', z.l10n.text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_aria_label = {
  update(element, valueAccessor) {
    element.setAttribute('aria-label', z.l10n.text(valueAccessor()));
  },
};
