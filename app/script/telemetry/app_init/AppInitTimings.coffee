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
z.telemetry ?= {}
z.telemetry.app_init ?= {}

class z.telemetry.app_init.AppInitTimings
  constructor: ->
    @logger = new z.util.Logger 'z.telemetry.AppInitTimings', z.config.LOGGER.OPTIONS
    @init = window.performance.now()

  get: =>
    timings = {}
    timings[key] = value for key, value of @ when key.toString() isnt 'init' and _.isNumber value
    return timings

  get_app_load: =>
    bucket_size = 10
    return bucket_size * (Math.floor(@[z.telemetry.app_init.AppInitTimingsStep.SHOWING_UI] / bucket_size / 1000) + 1)

  log: =>
    @logger.log @logger.levels.DEBUG, 'App initialization step durations'
    for key, value of @ when key.toString() isnt 'init' and _.isNumber value
      placeholder_key = Array(Math.max 27 - key.length, 1).join ' '
      placeholder_value = Array(Math.max 6 - value.toString().length, 1).join ' '
      @logger.log @logger.levels.INFO, "#{placeholder_key}'#{key}':#{placeholder_value}#{value}ms"

  time_step: (step) =>
    if not @[step]
      @[step] = window.parseInt window.performance.now() - @init
