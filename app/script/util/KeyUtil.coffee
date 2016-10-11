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
z.util ?= {}
z.util.KeyUtil ?= {}


# http://stackoverflow.com/a/1064139
z.util.KeyUtil.insert_at_caret = (txtarea, text) ->
  if not txtarea
    return
  scroll_pos = txtarea.scrollTop
  str_pos = 0
  br = if txtarea.selectionStart or txtarea.selectionStart is '0' then 'ff' else if document.selection then 'ie' else false
  if br is 'ie'
    txtarea.focus()
    range = document.selection.createRange()
    range.moveStart 'character', -txtarea.value.length
    str_pos = range.text.length
  else if br is 'ff'
    str_pos = txtarea.selectionStart
  front = txtarea.value.substring 0, str_pos
  back = txtarea.value.substring str_pos, txtarea.value.length
  txtarea.value = front + text + back
  str_pos = str_pos + text.length
  if br is 'ie'
    txtarea.focus()
    ie_range = document.selection.createRange()
    ie_range.moveStart 'character', -txtarea.value.length
    ie_range.moveStart 'character', str_pos
    ie_range.moveEnd 'character', 0
    ie_range.select()
  else if br is 'ff'
    txtarea.selectionStart = str_pos
    txtarea.selectionEnd = str_pos
    txtarea.focus()
  txtarea.scrollTop = scroll_pos
