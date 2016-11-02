#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.localization ?= {}

# Localizer to replace strings.
class Localizer
  # Construct a new Localizer.
  constructor: ->
    param = z.util.get_url_parameter z.auth.URLParameter.LOCALE
    z.util.StorageUtil.set_value z.storage.StorageKey.LOCALIZATION.LOCALE, param if param
    @locale = z.util.StorageUtil.get_value(z.storage.StorageKey.LOCALIZATION.LOCALE) or navigator.language.substr(0, 2) or 'en'
    # Moment defaults to the language loaded last. Thus we need to set the fallback to English until we use all locales.
    # @see http://momentjs.com/docs/#/i18n/changing-locale/
    moment.locale [@locale, 'en']
    $.extend z.string, z.string[@locale] if z.string[@locale]

  ###
  Pulls the localized string from the resources and replaces placeholders.

  @note Takes the id of the string for look up from z.string is directly for simple use. Else pass it in as the id
    parameter in conjunction with a single or multiple (it supports but does not require an array) replace rules that
    consist of a placeholder and the content that it should be replace with.

  @param id [String] Localization string ID
  @param replace [Object | Array<Object>] Placeholders that should be replaced
  @option replace [String] placeholder Content to be replaced
  @option replace [String] content replacing content
  ###
  get_text: (valueAccessor) ->
    return if not valueAccessor?
    args = []

    if valueAccessor.id?
      s = valueAccessor.id
      if _.isArray valueAccessor.replace
        args = valueAccessor.replace
      else
        args.push valueAccessor.replace
    else
      s = valueAccessor

    if args.length isnt 0
      for i in [0...args.length]
        reg = new RegExp args[i].placeholder, 'gm'
        s = s.replace reg, args[i].content

    return s

z.localization.Localizer = new Localizer()


# Knockout binding to localize links.
ko.bindingHandlers.l10n_href =
  update: (element, valueAccessor) ->
    element.setAttribute 'href', z.localization.Localizer.get_text valueAccessor()


# Knockout binding to localize input values.
ko.bindingHandlers.l10n_input =
  update: (element, valueAccessor) ->
    element.setAttribute 'value', z.localization.Localizer.get_text valueAccessor()


# Knockout binding to localize input placeholders.
ko.bindingHandlers.l10n_placeholder =
  update: (element, valueAccessor) ->
    element.setAttribute 'placeholder', z.localization.Localizer.get_text valueAccessor()


# Knockout binding to localize element text.
ko.bindingHandlers.l10n_text =
  update: (element, valueAccessor) ->
    ko.utils.setTextContent element, z.localization.Localizer.get_text valueAccessor()

# Knockout binding to localize element html content.
ko.bindingHandlers.l10n_html =
  update: (element, valueAccessor) ->
    ko.utils.setHtml element, z.localization.Localizer.get_text valueAccessor()

# Knockout binding to localize element tooltips.
ko.bindingHandlers.l10n_tooltip =
  update: (element, valueAccessor) ->
    element.setAttribute 'title', z.localization.Localizer.get_text valueAccessor()


# Knockout binding to localize element tooltips.
ko.bindingHandlers.l10n_aria_label =
  update: (element, valueAccessor) ->
    element.setAttribute 'aria-label', z.localization.Localizer.get_text valueAccessor()
