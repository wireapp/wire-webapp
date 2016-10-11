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

# display indicator dot
ko.bindingHandlers.unread_indicator =
  update: (element, valueAccessor, allBindings, conversation_et, context) ->
    value = valueAccessor()
    valueUnwrapped = ko.unwrap(value)

    css_class = 'bg-theme '

    if valueUnwrapped > 8
      css_class += 'dot-xl'
    else if valueUnwrapped > 6
      css_class += 'dot-lg'
    else if valueUnwrapped > 4
      css_class += 'dot-md'
    else if valueUnwrapped > 2
      css_class += 'dot-sm'
    else if valueUnwrapped > 0
      css_class += 'dot-xs'

    $(element)
      .removeClass()
      .addClass css_class

# show scroll borders
ko.bindingHandlers.bordered_list = do ->

  calculate_borders = _.throttle ($element) ->
    return if not $element
    window.requestAnimationFrame ->
      archive_column = $($element).parent()
      if $element.height() <= 0 or not $element.is_scrollable()
        return archive_column.removeClass 'left-list-center-border-bottom conversations-center-border-top'

      archive_column.toggleClass 'left-list-center-border-top', not $element.is_scrolled_top()
      archive_column.toggleClass 'left-list-center-border-bottom', not $element.is_scrolled_bottom()
  , 100

  init: (element) ->
    $element = $(element)
    $element.on 'scroll', -> calculate_borders $element
    $('.left').on 'click', -> calculate_borders $element
    $(window).on 'resize', -> calculate_borders $element
    amplify.subscribe z.event.WebApp.LOADED, -> calculate_borders $element

  update: (element, valueAccessor) ->
    ko.unwrap valueAccessor()
    calculate_borders $(element)
