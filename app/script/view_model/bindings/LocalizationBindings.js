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

ko.bindingHandlers.l10n_href = {
  update(element, valueAccessor) {
    const {support, type, path} = valueAccessor();
    const href = support ? z.util.URLUtil.buildSupportUrl(support) : z.util.URLUtil.buildUrl(type, z.l10n.text(path));
    element.setAttribute('href', href);
  },
};

ko.bindingHandlers.l10n_input = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitute} = valueAccessor();
    element.setAttribute('value', z.l10n.text(id, substitute));
  },
};

ko.bindingHandlers.l10n_placeholder = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitute} = valueAccessor();
    element.setAttribute('placeholder', z.l10n.text(id, substitute));
  },
};

ko.bindingHandlers.l10n_text = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitute} = valueAccessor();
    ko.utils.setTextContent(element, z.l10n.text(id, substitute));
  },
};

ko.bindingHandlers.l10nSafeHtml = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitutions} = valueAccessor();
    ko.utils.setHtml(element, z.l10n.safeHtml(id, substitutions));
  },
};

ko.bindingHandlers.l10n_tooltip = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitute} = valueAccessor();
    element.setAttribute('title', z.l10n.text(id, substitute));
  },
};

ko.bindingHandlers.l10n_aria_label = {
  update(element, valueAccessor) {
    const {id = valueAccessor(), substitute} = valueAccessor();
    element.setAttribute('aria-label', z.l10n.text(id, substitute));
  },
};
