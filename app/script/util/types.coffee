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
z.util.types ?= {}

z.util.types.convert_array_buffer_to_string = (input) ->
  if _.isString input
    payload = input
  else
    uncompressed = pako.inflate input
    payload = ''
    for char, i in uncompressed
      payload = "#{payload}#{String.fromCharCode uncompressed[i]}"
  return payload
