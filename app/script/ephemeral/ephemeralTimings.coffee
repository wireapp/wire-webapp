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
z.ephemeral ?= {}

z.ephemeral.timings = do ->

  # timings in milliseconds
  timings = [
    1000 * 5
    1000 * 15
    1000 * 30
    1000 * 60
    1000 * 60 * 5
    1000 * 60 * 60 * 24
  ]

  get_values = ->
    return timings

  map_to_closest_timing = (milliseconds) ->
    return z.util.ArrayUtil.find_closest timings, milliseconds

  return {
    get_values: get_values
    map_to_closest_timing: map_to_closest_timing
  }
