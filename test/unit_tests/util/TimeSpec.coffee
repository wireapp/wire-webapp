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

# grunt test_init && grunt test_run:util/Time

describe 'z.util.Time', ->
  describe 'ISO 8601 conversion', ->
    it 'can calculate the difference between two dates in milliseconds', ->
      iso_string_a = '2015-02-26T16:15:26.478Z'
      iso_string_b = '2015-02-26T16:14:53.478Z'

      actual = z.util.Time.ISO8601.get_time_difference_in_millis iso_string_a, iso_string_b
      expected = 33000

      expect(actual).toBe expected

    it 'can calculate the difference between two dates in seconds', ->
      iso_string_a = '2015-02-26T16:15:26.478Z'
      iso_string_b = '2015-02-26T16:14:53.478Z'

      actual = z.util.Time.ISO8601.get_time_difference_in_seconds iso_string_a, iso_string_b
      expected = 33

      expect(actual).toBe expected

    it 'can calculate the difference between two dates in minutes', ->
      iso_string_a = '2015-02-26T16:15:26.478Z'
      iso_string_b = '2015-02-26T16:14:53.478Z'

      actual = z.util.Time.ISO8601.get_time_difference_in_minutes iso_string_a, iso_string_b
      expected = 0.55

      expect(actual).toBe expected

    it 'returns "undefined" if wrong parameters are given', ->
      iso_string_a = 'a'
      iso_string_b = '2015-02-26T16:14:53.478Z'

      actual = z.util.Time.ISO8601.get_time_difference_in_minutes iso_string_a, iso_string_b
      expected = undefined

      expect(actual).toBe expected
