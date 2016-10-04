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

ko.bindingHandlers.input_hint =
  init: (element, valueAccessor) ->
    options = valueAccessor()
    trigger = options.trigger
    hint = $('<span class="hint"/>').text options.text

    if ko.isObservable trigger
      trigger.subscribe (value) ->
        if value is true
          window.requestAnimationFrame ->
            input_field = $(element).find('input')
            rect = input_field[0].getBoundingClientRect()

            hint
              .css
                left: rect.left
                top: rect.top - 30
              .appendTo document.body

            input_field.one 'keydown', ->
              hint.remove()
        else
          hint.remove()
