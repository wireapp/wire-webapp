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
z.localization = z.localization || {};

class Localizer {
  constructor() {
    let param = z.util.get_url_parameter(z.auth.URLParameter.LOCALE);
    if (param) {
      z.util.StorageUtil.set_value(z.storage.StorageKey.LOCALIZATION.LOCALE, param);
    }
    this.locale = z.util.StorageUtil.get_value(z.storage.StorageKey.LOCALIZATION.LOCALE) || navigator.language.substr(0, 2) || 'en';
    moment.locale([this.locale, 'en']);
    if (z.string[this.locale]) {
      $.extend(z.string, z.string[this.locale]);
    }
  }

  /*
  Pulls the localized string from the resources and replaces placeholders.

  @note Takes the id of the string for look up from z.string is directly for simple use. Else pass it in as the id
    parameter in conjunction with a single or multiple (it supports but does not require an array) replace rules that
    consist of a placeholder and the content that it should be replace with.

  @param valueAccessor [Object] contains localization string ID and replace object
    */

  get_text(valueAccessor) {
    if (valueAccessor == null) return;

    let args = [];
    let s = valueAccessor;
    if (valueAccessor.id != null) {
      s = valueAccessor.id;
      if (_.isArray(valueAccessor.replace)) {
        args = valueAccessor.replace;
      } else {
        args.push(valueAccessor.replace);
      }
    }
    if (args.length !== 0) {
      for (let arg of args) {
        const reg = new RegExp(arg.placeholder, 'gm');
        s = s.replace(reg, arg.content);
      }
    }
    return s;
  }
}

z.localization.Localizer = new Localizer();

ko.bindingHandlers.l10n_href = {
  update(element, valueAccessor) {
    element.setAttribute('href', z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_input = {
  update(element, valueAccessor) {
    element.setAttribute('value', z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_placeholder = {
  update(element, valueAccessor) {
    element.setAttribute('placeholder', z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_text = {
  update(element, valueAccessor) {
    ko.utils.setTextContent(element, z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_html = {
  update(element, valueAccessor) {
    ko.utils.setHtml(element, z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_tooltip = {
  update(element, valueAccessor) {
    element.setAttribute('title', z.localization.Localizer.get_text(valueAccessor()));
  },
};

ko.bindingHandlers.l10n_aria_label = {
  update(element, valueAccessor) {
    element.setAttribute('aria-label', z.localization.Localizer.get_text(valueAccessor()));
  },
};
