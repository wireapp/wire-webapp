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

window.z ?= {}
z.util ?= {}


z.util.NumberUtil =
  in_range: (value, lower_bound, upper_bound) ->
    return value >= lower_bound and value <= upper_bound

  root_mean_square: (float_array) ->
    pow = float_array.map (n) -> Math.pow n, 2
    sum = pow.reduce (p, n) -> p + n
    Math.sqrt(sum) / float_array.length

  cap_to_byte: (value) ->
    MAX_VALUE = 255
    Math.min Math.abs(parseInt(value * MAX_VALUE, 10)), MAX_VALUE
