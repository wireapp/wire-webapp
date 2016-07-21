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

class z.util.TimeTracker
  constructor: ->
    @time =
      start: -1
      stop: -1
      tracked: -1
      in_seconds: -1
      in_mseconds: -1

  start_timer: =>
    @time.start = (window.performance or Date).now()

  stop_timer: =>
    if @time.start is -1
      # You have to start the timer before logging.
      return

    @time.stop = (window.performance or Date).now()
    @time.tracked = @time.stop - @time.start
    @time.in_mseconds = Math.round @time.tracked
    @time.in_seconds = (@time.tracked / 1000).toFixed 2
    @get_formatted_time_message()

  get_formatted_time: =>
    return "#{@time.in_mseconds}ms (#{@time.in_seconds}s)"

  get_formatted_time_message: =>
    return "Time measured was #{@get_formatted_time()}."
