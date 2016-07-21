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

# grunt test_init && grunt test_run:util/Comparison

describe 'z.util.Comparison', ->
  describe 'max_number', ->
    it 'figures out which is the largest of two numbers', ->
      smaller_number = 3
      higher_number = 1429618343

      actual = z.util.Comparison.max_number smaller_number, higher_number
      expect(actual).toBe higher_number

      actual = z.util.Comparison.max_number higher_number, smaller_number
      expect(actual).toBe higher_number

    it 'returns the other number if one of them is not a number', ->
      higher_number = 3
      not_a_number = NaN

      actual = z.util.Comparison.max_number higher_number, not_a_number
      expect(actual).toBe higher_number

      actual = z.util.Comparison.max_number not_a_number, higher_number
      expect(actual).toBe higher_number

    it 'returns NaN if both numbers are not numbers', ->
      actual = z.util.Comparison.max_number NaN, NaN
      expect(actual).toBeNaN()

  describe 'min_number', ->
    it 'figures out which is the smallest of two numbers', ->
      smaller_number = 3
      higher_number = 1429618343

      actual = z.util.Comparison.min_number smaller_number, higher_number
      expect(actual).toBe smaller_number

      actual = z.util.Comparison.min_number higher_number, smaller_number
      expect(actual).toBe smaller_number

    it 'returns the other number if one of them is not a number', ->
      smaller_number = 3
      not_a_number = NaN

      actual = z.util.Comparison.min_number smaller_number, not_a_number
      expect(actual).toBe smaller_number

      actual = z.util.Comparison.min_number not_a_number, smaller_number
      expect(actual).toBe smaller_number

    it 'returns NaN if both numbers are not numbers', ->
      actual = z.util.Comparison.min_number NaN, NaN
      expect(actual).toBeNaN()
