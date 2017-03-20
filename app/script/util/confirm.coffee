#
# Wire
# Copyright (C) 2017 Wire Swiss GmbH
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



# show confirm template inside the specified element
#
# @example show confirm dialog
#
# $('#parent').confirm
#  template: '#template-confirm'
#  data:
#    foo: 'bar'
#  confirm: ->
#    ... do something on confirm ...
#  cancel: ->
#    ... do something on cancel ...
#
# @param [Object]
# @option template: [String] template that will be displayed
# @option data: [object] used as viewmodel for this dialog
# @option confirm: [Function] will be executed when confirm button is clicked
# @option cancel: [Function] will be executed when cancel button is clicked
#
$.fn.confirm = (config) ->

  template_html = $(config.template).html()
  parent = $(@)
  parent.append template_html
  confirm = parent.find '.confirm'
  group = parent.find '.participants-group'
  is_visible = true

  is_small = group.hasClass 'small'
  group.removeClass 'small' if is_small

  ko.applyBindings config.data, confirm[0]

  if config.data?.user?
    stripped_user_name = config.data.user.first_name()
    parent
      .find '.user'
      .html z.util.escape_html stripped_user_name

  window.requestAnimationFrame ->
    confirm.addClass 'confirm-is-visible'

  @destroy = ->
    is_visible = false
    ko.cleanNode confirm[0]
    group.addClass 'small' if is_small
    parent.find('.confirm').remove()

  @is_visible = ->
    return is_visible

  $('[data-action="cancel"]', confirm).click =>
    config.cancel? config.data
    @destroy()

  $('[data-action="confirm"]', confirm).click =>
    config.confirm? config.data
    @destroy()

  return @
