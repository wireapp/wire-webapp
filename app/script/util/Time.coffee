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

z.util.Time = do ->
  ISO8601 = {}

  ISO8601.get_time_difference_in_millis = (iso_string_a, iso_string_b) ->
    date_a_in_millis = new Date(iso_string_a).getTime()
    date_b_in_millis = new Date(iso_string_b).getTime()
    difference = date_a_in_millis - date_b_in_millis
    return undefined if window.isNaN difference
    return Math.abs(date_a_in_millis - date_b_in_millis)

  ISO8601.get_time_difference_in_seconds = (iso_string_a, iso_string_b) ->
    difference = ISO8601.get_time_difference_in_millis iso_string_a, iso_string_b
    return undefined if window.isNaN difference
    return window.parseInt Math.abs(difference / 1000), 10

  ISO8601.get_time_difference_in_minutes = (iso_string_a, iso_string_b) ->
    difference = ISO8601.get_time_difference_in_millis iso_string_a, iso_string_b
    return undefined if window.isNaN difference
    return Math.abs(((difference) / 1000) / 60)

  public_methods =
    ISO8601: ISO8601

  return public_methods
