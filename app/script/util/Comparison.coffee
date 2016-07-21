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

z.util.Comparison = do ->

  public_methods =
    max_number: (a, b) ->
      return a if window.isNaN(b) and not window.isNaN(a)
      return b if window.isNaN(a) and not window.isNaN(b)
      return if a >= b then a else b
    min_number: (a, b) ->
      return a if window.isNaN(b) and not window.isNaN(a)
      return b if window.isNaN(a) and not window.isNaN(b)
      return if a >= b then b else a

  return public_methods
