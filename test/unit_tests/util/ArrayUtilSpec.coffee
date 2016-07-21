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

###############################################################################
# z.util.ArrayUtil.interpolate
###############################################################################
describe 'z.util.ArrayUtil.interpolate', ->

  it 'should interpolate array with bigger length', ->
    expect(z.util.ArrayUtil.interpolate([1, 5, 3], 5)).toEqual [1, 3, 5, 4, 3]

  it 'should interpolate array with bigger length', ->
    expect(z.util.ArrayUtil.interpolate([1, 3, 5, 4, 3], 3)).toEqual [1, 5, 3]

  it 'should keep first and last value', ->
    interpolated_array = z.util.ArrayUtil.interpolate([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 5)
    expect(interpolated_array[0]).toEqual 0
    expect(interpolated_array[interpolated_array.length - 1]).toEqual 9
