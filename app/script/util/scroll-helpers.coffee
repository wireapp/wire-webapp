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



$.fn.scroll_end = ->
  element = $(@).get 0
  return if not element
  return element.scrollHeight - element.clientHeight


$.fn.scroll_to_bottom = ->
  $element = $(@)
  return if $element.length is 0
  $element.scrollTop $element[0].scrollHeight

$.fn.scroll_by = (distance) ->
  $element = $(@)
  return if $element.length is 0
  scroll_top = $element[0].scrollTop
  $element.scrollTop scroll_top + distance


$.fn.is_scrolled_bottom = (offset = 0) ->
  $element = $(@)
  return if $element.length is 0
  scroll_top = Math.ceil $element.scrollTop()
  scroll_height = $element[0].scrollHeight
  height = $element[0].clientHeight
  return scroll_top + height + offset >= scroll_height

$.fn.is_scrolled_top = ->
  $element = $(@)
  return if $element.length is 0
  return $element.scrollTop() is 0

$.fn.is_scrollable = ->
  element = $(@).get 0
  return if not element
  return element.scrollHeight > element.clientHeight
