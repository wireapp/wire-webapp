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
z.util.Statistics ?= {}

###
Calculates the average of all values within an array.

@param values [Array<Integers>] Input values
@param sum [Integer] (optional) Sum value

@return [Integer] Average value
###
z.util.Statistics.average = (values) ->
  return (z.util.Statistics.sum(values) / values.length).toFixed 2


###
Calculates the sum of all value within an array.

@param values [Array<Integers>] Input values

@return [Integer] Sum value
###
z.util.Statistics.sum = (values) ->
  return values.reduce (sum, value) ->
    sum + value
  , 0


###
Calculates the standard deviation within an array.

@param values [Array<Integers>] Input values
@param average [Integer] (optional) Average value
###
z.util.Statistics.standard_deviation = (values, average) ->
  average = z.util.Statistics.average values if not average
  squared_deviations = values.map (value) ->
    deviation = value - average
    return deviation * deviation

  return (Math.sqrt z.util.Statistics.average squared_deviations).toFixed 2
