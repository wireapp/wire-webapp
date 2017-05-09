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

# grunt test_init && grunt test_run:util/ArrayUtil

describe 'z.util.ArrayUtil', ->
  describe 'chunk', ->
    arr = null

    beforeEach ->
      arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

    it 'returns one chunk with all items when the size is bigger than the array', ->
      actual = z.util.ArrayUtil.chunk arr, 10
      expect(actual.length).toBe 1
      expect(actual[0].length).toBe 10
      expect(actual[0][0]).toBe 1
      expect(actual[0][9]).toBe 10

    it 'returns the correct chunks', ->
      actual = z.util.ArrayUtil.chunk arr, 3
      expect(actual.length).toBe 4
      expect(actual[0].length).toBe 3
      expect(actual[1].length).toBe 3
      expect(actual[2].length).toBe 3
      expect(actual[3].length).toBe 1

    it 'does not effect the original array', ->
      actual = z.util.ArrayUtil.chunk arr, 3
      expect(actual.length).toBe 4
      expect(actual[0].length).toBe 3
      expect(actual[1].length).toBe 3
      expect(actual[2].length).toBe 3
      expect(actual[3].length).toBe 1
      expect(arr.length).toBe 10

  describe 'get_next_item', ->
    a = 'a'
    b = 'b'
    c = 'c'
    d = 'd'
    array = [a, b, c]
    filter = (item) -> item isnt 'b'

    it 'returns the second item when first item was given', ->
      expect(z.util.ArrayUtil.get_next_item array, a).toEqual b

    it 'returns the third item when first item was given and filter skips the second item', ->
      expect(z.util.ArrayUtil.get_next_item array, a, filter).toEqual c

    it 'returns the second item when last item was given', ->
      expect(z.util.ArrayUtil.get_next_item array, c).toEqual b

    it 'returns undefined when item is not in the array', ->
      expect(z.util.ArrayUtil.get_next_item array, d).toEqual null

  describe 'interpolate', ->
    it 'interpolates arrays with bigger lengths', ->
      expect(z.util.ArrayUtil.interpolate([1, 5, 3], 5)).toEqual [1, 3, 5, 4, 3]

    it 'interpolates arrays with bigger lengths (2nd example)', ->
      expect(z.util.ArrayUtil.interpolate([1, 3, 5, 4, 3], 3)).toEqual [1, 5, 3]

    it 'keeps the first and the last value', ->
      interpolated_array = z.util.ArrayUtil.interpolate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
      expect(interpolated_array[0]).toEqual 0
      expect(interpolated_array[interpolated_array.length - 1]).toEqual 9

  describe 'is_last_item', ->
    a = 'a'
    b = 'b'
    c = 'c'
    d = 'd'
    array = [a, b, c]

    it 'returns true for the last item', ->
      expect(z.util.ArrayUtil.is_last_item array, c).toBeTruthy()

    it 'returns false for any item that is not the last', ->
      expect(z.util.ArrayUtil.is_last_item array, a).toBeFalsy()
      expect(z.util.ArrayUtil.is_last_item array, b).toBeFalsy()

    it 'returns false for an item that is not in the array', ->
      expect(z.util.ArrayUtil.is_last_item array, d).toBeFalsy()

  describe 'iterate_index', ->
    array = ['A', 'B', 'C', 'D', 'E']

    it 'returns undefined in case of wrong input parameters', ->
      expect(z.util.ArrayUtil.iterate_index 'Test', 0).toBe undefined
      expect(z.util.ArrayUtil.iterate_index [1, 2, 3], 'Test').toBe undefined
      expect(z.util.ArrayUtil.iterate_index [], 0).toBe undefined

    it 'should iterate through the array index', ->
      expect(z.util.ArrayUtil.iterate_index array, 0).toBe 1
      expect(z.util.ArrayUtil.iterate_index array, 1).toBe 2
      expect(z.util.ArrayUtil.iterate_index array, 2).toBe 3
      expect(z.util.ArrayUtil.iterate_index array, 3).toBe 4
      expect(z.util.ArrayUtil.iterate_index array, 4).toBe 0

    it 'should iterate through the array index in reverse order', ->
      expect(z.util.ArrayUtil.iterate_index array, 0, true).toBe 4
      expect(z.util.ArrayUtil.iterate_index array, 1, true).toBe 0
      expect(z.util.ArrayUtil.iterate_index array, 2, true).toBe 1
      expect(z.util.ArrayUtil.iterate_index array, 3, true).toBe 2
      expect(z.util.ArrayUtil.iterate_index array, 4, true).toBe 3

  describe 'iterate_item', ->
    array = ['A', 'B', 'C', 'D', 'E']

    it 'returns undefined in case of wrong input parameters', ->
      expect(z.util.ArrayUtil.iterate_item 'Test', 0).toBe undefined
      expect(z.util.ArrayUtil.iterate_item [], 0).toBe undefined
      expect(z.util.ArrayUtil.iterate_item [1, 2, 3], 'Test').toBe undefined

    it 'should iterate through the array items', ->
      expect(z.util.ArrayUtil.iterate_item array, 'A').toBe 'B'
      expect(z.util.ArrayUtil.iterate_item array, 'B').toBe 'C'
      expect(z.util.ArrayUtil.iterate_item array, 'C').toBe 'D'
      expect(z.util.ArrayUtil.iterate_item array, 'D').toBe 'E'
      expect(z.util.ArrayUtil.iterate_item array, 'E').toBe 'A'

    it 'should iterate through the array items in reverse order', ->
      expect(z.util.ArrayUtil.iterate_item array, 'A', true).toBe 'E'
      expect(z.util.ArrayUtil.iterate_item array, 'B', true).toBe 'A'
      expect(z.util.ArrayUtil.iterate_item array, 'C', true).toBe 'B'
      expect(z.util.ArrayUtil.iterate_item array, 'D', true).toBe 'C'
      expect(z.util.ArrayUtil.iterate_item array, 'E', true).toBe 'D'
