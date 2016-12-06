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
z.util.ArrayUtil ?= {}

###
Returns random element

@param array [Array] source
@return [Object] random element
###
z.util.ArrayUtil.random_element = (array) ->
  array[Math.floor(Math.random() * array.length)]

###
Remove given element from array

@param array [Array] source
@return [Array|undefined] containing the removed element
###
z.util.ArrayUtil.remove_element = (array, element) ->
  index = array.indexOf element
  array.splice index, 1 if index > -1

z.util.ArrayUtil.contains = (array, value) ->
  return array.indexOf(value) > -1

z.util.ArrayUtil.find_closest = (array, value) ->
  closest = array[0]
  array.forEach (current) ->
    closest = current if value >= current
  return closest

###
Interpolates an array of numbers using linear interpolation

@param array [Array] source
@param length [Number] new length
@return [Array] new array with interpolated values
###
z.util.ArrayUtil.interpolate = (array, length) ->
  new_array = []
  scale_factor = (array.length - 1) / (length - 1)

  new_array[0] = array[0]
  new_array[length - 1] = array[array.length - 1]

  for i in [1...length - 1]
    original_index = i * scale_factor
    before = Math.floor(original_index).toFixed()
    after = Math.ceil(original_index).toFixed()
    point = original_index - before
    new_array[i] = array[before] + (array[after] - array[before]) * point # linear interpolation

  return new_array
